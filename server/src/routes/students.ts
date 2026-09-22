import { Router, Response } from 'express';
import { query, queryOne, execute, transaction } from '../database/pgDb';
import { authenticate, AuthRequest, requireRoles } from '../middleware/auth';
import { logAudit } from '../middleware/audit';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export const studentsRouter = Router();

// 1. Get Class/Section/Batch Options for dropdowns
studentsRouter.get('/options/classes-batches', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const branchId = (req.query.branch_id as string) || req.user!.branch_id;
    const [classes, sections, batches, hostelRooms] = await Promise.all([
      query(`SELECT * FROM classes WHERE branch_id = $1 ORDER BY name ASC`, [branchId]),
      query(`SELECT * FROM sections ORDER BY name ASC`),
      query(`SELECT * FROM batches ORDER BY name ASC`),
      query(`
        SELECT hr.*, hb.name as block_name, hb.gender_type 
        FROM hostel_rooms hr
        JOIN hostel_blocks hb ON hr.hostel_block_id = hb.id
        WHERE hb.branch_id = $1
        ORDER BY hb.name, hr.floor_number, hr.room_number
      `, [branchId])
    ]);

    return res.json({ classes, sections, batches, hostelRooms });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 2. Get Student Profile (For Logged-in Student or Parent)
studentsRouter.get('/me/profile', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const role = req.user!.role;

    let studentProfile: any = null;

    if (role === 'STUDENT') {
      studentProfile = await queryOne(`
        SELECT sp.*, u.email as user_email, u.phone as user_phone, u.avatar_url,
               c.name as class_name, sec.name as section_name, b.name as batch_name,
               br.name as branch_name, br.code as branch_code, br.city as branch_city,
               p.father_name, p.mother_name, p.primary_phone as parent_phone, p.emergency_contact
        FROM student_profiles sp
        JOIN users u ON sp.user_id = u.id
        JOIN branches br ON u.branch_id = br.id
        JOIN classes c ON sp.class_id = c.id
        JOIN sections sec ON sp.section_id = sec.id
        JOIN batches b ON sp.batch_id = b.id
        LEFT JOIN parents p ON sp.parent_id = p.id
        WHERE sp.user_id = $1 OR sp.id = $2
      `, [userId, req.user!.student_id || '']);
    } else if (role === 'PARENT') {
      // Find parent's linked student
      studentProfile = await queryOne(`
        SELECT sp.*, u.email as user_email, u.phone as user_phone, u.avatar_url,
               c.name as class_name, sec.name as section_name, b.name as batch_name,
               br.name as branch_name, br.code as branch_code, br.city as branch_city,
               p.father_name, p.mother_name, p.primary_phone as parent_phone, p.emergency_contact
        FROM parents p
        JOIN student_profiles sp ON sp.parent_id = p.id
        JOIN users u ON sp.user_id = u.id
        JOIN branches br ON u.branch_id = br.id
        JOIN classes c ON sp.class_id = c.id
        JOIN sections sec ON sp.section_id = sec.id
        JOIN batches b ON sp.batch_id = b.id
        WHERE p.user_id = $1
      `, [userId]);
    } else {
      return res.status(400).json({ error: 'Endpoint is for students and parents only.' });
    }

    if (!studentProfile) {
      return res.status(404).json({ error: 'Student profile not found.' });
    }

    // Hostel Info if hosteller
    const hostelInfo = await queryOne(`
      SELECT ha.*, hr.room_number, hr.floor_number, hb.name as block_name
      FROM hostel_allocations ha
      JOIN hostel_rooms hr ON ha.room_id = hr.id
      JOIN hostel_blocks hb ON hr.hostel_block_id = hb.id
      WHERE ha.student_id = $1 AND ha.status = 'ACTIVE'
    `, [studentProfile.id]);

    // Enrolled Subjects
    const enrolledSubjects = await query(`
      SELECT se.*, s.name as subject_name, s.code as subject_code
      FROM student_enrollments se
      JOIN subjects s ON se.subject_id = s.id
      WHERE se.student_id = $1
      ORDER BY s.name ASC
    `, [studentProfile.id]);

    // Recent Attendance Summary
    const attendanceStats = await queryOne(`
      SELECT 
        COUNT(*) as total_lectures,
        SUM(CASE WHEN ar.status = 'PRESENT' THEN 1 ELSE 0 END) as present_count,
        SUM(CASE WHEN ar.status = 'ABSENT' THEN 1 ELSE 0 END) as absent_count,
        SUM(CASE WHEN ar.status = 'LATE' THEN 1 ELSE 0 END) as late_count
      FROM attendance_records ar
      WHERE ar.student_id = $1
    `, [studentProfile.id]);

    return res.json({
      profile: studentProfile,
      hostelInfo,
      enrolledSubjects,
      attendanceStats: {
        total: parseInt(attendanceStats?.total_lectures || '0', 10),
        present: parseInt(attendanceStats?.present_count || '0', 10),
        absent: parseInt(attendanceStats?.absent_count || '0', 10),
        late: parseInt(attendanceStats?.late_count || '0', 10),
        percentage: attendanceStats?.total_lectures > 0
          ? Math.round((parseInt(attendanceStats.present_count || '0', 10) / parseInt(attendanceStats.total_lectures, 10)) * 100)
          : 100
      }
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 3. List All Students with Filters (Admin, Principal, HOD, Teacher, Staff, Warden)
studentsRouter.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const branchId = (req.query.branch_id as string) || req.user!.branch_id;
    const classId = req.query.class_id as string;
    const sectionId = req.query.section_id as string;
    const batchId = req.query.batch_id as string;
    const residentialStatus = req.query.residential_status as string; // 'DAY_SCHOLAR' | 'HOSTELLER'
    const search = req.query.search as string;

    let sql = `
      SELECT sp.*, u.email, u.phone as user_phone, u.avatar_url, u.is_active,
             c.name as class_name, sec.name as section_name, b.name as batch_name,
             p.father_name, p.mother_name, p.primary_phone as parent_phone,
             hr.room_number as hostel_room_number, hb.name as hostel_block_name
      FROM student_profiles sp
      JOIN users u ON sp.user_id = u.id
      JOIN classes c ON sp.class_id = c.id
      JOIN sections sec ON sp.section_id = sec.id
      JOIN batches b ON sp.batch_id = b.id
      LEFT JOIN parents p ON sp.parent_id = p.id
      LEFT JOIN hostel_allocations ha ON ha.student_id = sp.id AND ha.status = 'ACTIVE'
      LEFT JOIN hostel_rooms hr ON ha.room_id = hr.id
      LEFT JOIN hostel_blocks hb ON hr.hostel_block_id = hb.id
      WHERE u.branch_id = $1
    `;
    const params: any[] = [branchId];

    if (classId) {
      params.push(classId);
      sql += ` AND sp.class_id = $${params.length}`;
    }
    if (sectionId) {
      params.push(sectionId);
      sql += ` AND sp.section_id = $${params.length}`;
    }
    if (batchId) {
      params.push(batchId);
      sql += ` AND sp.batch_id = $${params.length}`;
    }
    if (residentialStatus) {
      params.push(residentialStatus);
      sql += ` AND sp.residential_status = $${params.length}`;
    }
    if (search) {
      params.push(`%${search.toLowerCase()}%`);
      sql += ` AND (
        LOWER(sp.name) LIKE $${params.length} OR 
        LOWER(sp.admission_number) LIKE $${params.length} OR 
        LOWER(sp.roll_number) LIKE $${params.length} OR
        LOWER(p.father_name) LIKE $${params.length} OR
        p.primary_phone LIKE $${params.length}
      )`;
    }

    sql += ` ORDER BY c.name, sec.name, sp.name ASC`;

    const students = await query(sql, params);
    return res.json({ students });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 4. Get Specific Student Detail by ID
studentsRouter.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    const student = await queryOne(`
      SELECT sp.*, u.email as user_email, u.phone as user_phone, u.avatar_url, u.is_active,
             c.name as class_name, sec.name as section_name, b.name as batch_name,
             br.name as branch_name, br.code as branch_code, br.city as branch_city,
             p.father_name, p.mother_name, p.primary_phone as parent_phone, p.emergency_contact, p.address as parent_address,
             hr.room_number as hostel_room_number, hr.floor_number as hostel_floor_number, hb.name as hostel_block_name, ha.bed_number
      FROM student_profiles sp
      JOIN users u ON sp.user_id = u.id
      JOIN branches br ON u.branch_id = br.id
      JOIN classes c ON sp.class_id = c.id
      JOIN sections sec ON sp.section_id = sec.id
      JOIN batches b ON sp.batch_id = b.id
      LEFT JOIN parents p ON sp.parent_id = p.id
      LEFT JOIN hostel_allocations ha ON ha.student_id = sp.id AND ha.status = 'ACTIVE'
      LEFT JOIN hostel_rooms hr ON ha.room_id = hr.id
      LEFT JOIN hostel_blocks hb ON hr.hostel_block_id = hb.id
      WHERE sp.id = $1
    `, [id]);

    if (!student) {
      return res.status(404).json({ error: 'Student profile not found.' });
    }

    // Enrolled Subjects
    const enrolledSubjects = await query(`
      SELECT se.*, s.name as subject_name, s.code as subject_code
      FROM student_enrollments se
      JOIN subjects s ON se.subject_id = s.id
      WHERE se.student_id = $1
      ORDER BY s.name ASC
    `, [id]);

    // Exam Marks
    const marks = await query(`
      SELECT sm.*, es.max_marks, es.passing_marks, es.exam_date,
             e.name as exam_name, e.exam_type,
             s.name as subject_name, s.code as subject_code
      FROM student_marks sm
      JOIN exam_subjects es ON sm.exam_subject_id = es.id
      JOIN exams e ON es.exam_id = e.id
      JOIN subjects s ON es.subject_id = s.id
      WHERE sm.student_id = $1
      ORDER BY es.exam_date DESC
    `, [id]);

    return res.json({ student, enrolledSubjects, marks });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 5. Register New Student (Admin, Principal)
studentsRouter.post('/', authenticate, requireRoles('ADMIN', 'PRINCIPAL'), async (req: AuthRequest, res: Response) => {
  const {
    name,
    admission_number,
    roll_number,
    class_id,
    section_id,
    batch_id,
    gender,
    date_of_birth,
    blood_group,
    residential_status,
    father_name,
    mother_name,
    parent_phone,
    parent_email,
    parent_address,
    password
  } = req.body;

  if (!name || !admission_number || !class_id || !section_id || !batch_id) {
    return res.status(400).json({ error: 'Name, admission number, class, section, and batch are required.' });
  }

  try {
    const branchId = req.user!.branch_id;
    const studentUserId = 'usr-' + crypto.randomUUID();
    const parentUserId = 'usr-' + crypto.randomUUID();
    const studentProfileId = 'std-' + crypto.randomUUID();
    const parentProfileId = 'par-' + crypto.randomUUID();

    const studentUsername = admission_number.toLowerCase().replace(/[^a-z0-9]/g, '');
    const parentUsername = 'p_' + studentUsername;
    const defaultPasswordHash = await bcrypt.hash(password || 'Demo@12345', 10);

    await transaction(async (client) => {
      // 1. Create Parent User & Parent Profile
      await client.query(`
        INSERT INTO users (id, branch_id, role, username, email, password_hash, name, phone, is_active)
        VALUES ($1, $2, 'PARENT', $3, $4, $5, $6, $7, 1)
      `, [parentUserId, branchId, parentUsername, parent_email || `${parentUsername}@college.test`, defaultPasswordHash, father_name || `${name}'s Parent`, parent_phone || '']);

      await client.query(`
        INSERT INTO parents (id, user_id, father_name, mother_name, primary_phone, address, emergency_contact)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [parentProfileId, parentUserId, father_name || 'Father Name', mother_name || 'Mother Name', parent_phone || '', parent_address || '', parent_phone || '']);

      // 2. Create Student User & Student Profile
      await client.query(`
        INSERT INTO users (id, branch_id, role, username, email, password_hash, name, phone, is_active)
        VALUES ($1, $2, 'STUDENT', $3, $4, $5, $6, $7, 1)
      `, [studentUserId, branchId, studentUsername, `${studentUsername}@college.test`, defaultPasswordHash, name, parent_phone || '']);

      await client.query(`
        INSERT INTO student_profiles (
          id, user_id, parent_id, admission_number, roll_number, name, gender, date_of_birth,
          blood_group, class_id, section_id, batch_id, academic_year_id, residential_status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'ay-2026-27', $13)
      `, [
        studentProfileId,
        studentUserId,
        parentProfileId,
        admission_number,
        roll_number || admission_number.split('-').pop() || '01',
        name,
        gender || 'Male',
        date_of_birth || '2008-05-15',
        blood_group || 'O+',
        class_id,
        section_id,
        batch_id,
        residential_status || 'DAY_SCHOLAR'
      ]);

      // 3. Auto-enroll student into subjects for this class
      const subjects = await client.query(`SELECT id FROM subjects ORDER BY name ASC`);
      for (const subj of subjects.rows) {
        const enrId = 'enr-' + crypto.randomUUID();
        await client.query(`
          INSERT INTO student_enrollments (id, student_id, subject_id, academic_year_id)
          VALUES ($1, $2, $3, 'ay-2026-27')
          ON CONFLICT DO NOTHING
        `, [enrId, studentProfileId, subj.id]);
      }
    });

    await logAudit(req, 'STUDENT_REGISTERED', 'student_profiles', studentProfileId, {
      name,
      admission_number,
      class_id,
      residential_status
    });

    return res.status(201).json({
      success: true,
      message: 'Student and parent accounts successfully enrolled.',
      studentId: studentProfileId
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 6. Update Student Profile
studentsRouter.put('/:id', authenticate, requireRoles('ADMIN', 'PRINCIPAL', 'HOD'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const {
    name,
    class_id,
    section_id,
    batch_id,
    residential_status,
    blood_group,
    roll_number,
    father_name,
    mother_name,
    parent_phone
  } = req.body;

  try {
    const student = await queryOne<{ user_id: string; parent_id: string }>(`SELECT user_id, parent_id FROM student_profiles WHERE id = $1`, [id]);
    if (!student) {
      return res.status(404).json({ error: 'Student not found.' });
    }

    await transaction(async (client) => {
      if (name) {
        await client.query(`UPDATE users SET name = $1 WHERE id = $2`, [name, student.user_id]);
      }

      await client.query(`
        UPDATE student_profiles
        SET name = COALESCE($1, name),
            class_id = COALESCE($2, class_id),
            section_id = COALESCE($3, section_id),
            batch_id = COALESCE($4, batch_id),
            residential_status = COALESCE($5, residential_status),
            blood_group = COALESCE($6, blood_group),
            roll_number = COALESCE($7, roll_number)
        WHERE id = $8
      `, [name, class_id, section_id, batch_id, residential_status, blood_group, roll_number, id]);

      if (student.parent_id && (father_name || mother_name || parent_phone)) {
        await client.query(`
          UPDATE parents
          SET father_name = COALESCE($1, father_name),
              mother_name = COALESCE($2, mother_name),
              primary_phone = COALESCE($3, primary_phone)
          WHERE id = $4
        `, [father_name, mother_name, parent_phone, student.parent_id]);
      }
    });

    await logAudit(req, 'STUDENT_UPDATED', 'student_profiles', id, { name, class_id, residential_status });

    return res.json({ success: true, message: 'Student profile updated successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});
