import { Router, Response } from 'express';
import { query, queryOne, execute, transaction } from '../database/pgDb';
import { authenticate, AuthRequest, requireRoles } from '../middleware/auth';
import { logAudit } from '../middleware/audit';
import crypto from 'crypto';

export const hostelRouter = Router();

// 1. Get Hostel Hierarchy (Hostel -> Blocks -> Rooms -> Beds -> Students)
hostelRouter.get('/hierarchy', authenticate, async (req: AuthRequest, res: Response) => {
  const branchId = (req.query.branch_id as string) || req.user!.branch_id;

  const hostels = await query(`SELECT * FROM hostels WHERE branch_id = ?`, [branchId]);
  const blocks = await query(`
    SELECT hb.* FROM hostel_blocks hb
    JOIN hostels h ON hb.hostel_id = h.id
    WHERE h.branch_id = ?
  `, [branchId]);
  const rooms = await query(`
    SELECT hr.*, hb.name as block_name, hb.hostel_id
    FROM hostel_rooms hr
    JOIN hostel_blocks hb ON hr.block_id = hb.id
    JOIN hostels h ON hb.hostel_id = h.id
    WHERE h.branch_id = ?
    ORDER BY hr.floor ASC, hr.room_number ASC
  `, [branchId]);
  const beds = await query(`
    SELECT hbed.*, hr.room_number, hr.floor, hr.block_id, sp.name as student_name,
           sp.register_number, sp.photo_url, sp.phone as student_phone,
           c.name as class_name, sec.name as section_name, b.name as batch_name
    FROM hostel_beds hbed
    JOIN hostel_rooms hr ON hbed.room_id = hr.id
    JOIN hostel_blocks hbl ON hr.block_id = hbl.id
    JOIN hostels h ON hbl.hostel_id = h.id
    LEFT JOIN student_profiles sp ON hbed.student_id = sp.id
    LEFT JOIN classes c ON sp.class_id = c.id
    LEFT JOIN sections sec ON sp.section_id = sec.id
    LEFT JOIN batches b ON sp.batch_id = b.id
    WHERE h.branch_id = ?
  `, [branchId]);

  return res.json({ hostels, blocks, rooms, beds });
});

// 2. Get Daily / Room-wise Hostel Attendance
hostelRouter.get('/attendance', authenticate, async (req: AuthRequest, res: Response) => {
  const branchId = (req.query.branch_id as string) || req.user!.branch_id;
  const date = (req.query.date as string) || new Date().toISOString().split('T')[0];
  const roomId = req.query.room_id as string;
  const floor = req.query.floor ? parseInt(req.query.floor as string, 10) : undefined;

  let sql = `
    SELECT sp.id as student_id, sp.name as student_name, sp.register_number, sp.photo_url,
           hr.id as room_id, hr.room_number, hr.floor,
           hb.name as block_name, hbed.bed_number,
           ha.id as attendance_id,
           COALESCE(ha.status, 'PRESENT') as status,
           ha.time, ha.remarks,
           u_w.name as warden_name
    FROM hostel_beds hbed
    JOIN hostel_rooms hr ON hbed.room_id = hr.id
    JOIN hostel_blocks hb ON hr.block_id = hb.id
    JOIN hostels h ON hb.hostel_id = h.id
    JOIN student_profiles sp ON hbed.student_id = sp.id
    LEFT JOIN hostel_attendance ha ON ha.student_id = sp.id AND ha.date = ?
    LEFT JOIN users u_w ON ha.warden_id = u_w.id
    WHERE h.branch_id = ?
  `;
  const params: any[] = [date, branchId];

  if (roomId) {
    sql += ` AND hr.id = ?`;
    params.push(roomId);
  }
  if (floor !== undefined) {
    sql += ` AND hr.floor = ?`;
    params.push(floor);
  }

  sql += ` ORDER BY hr.floor ASC, hr.room_number ASC, hbed.bed_number ASC`;

  const records = await query(sql, params);

  // Check if any students are on approved outpass currently
  const outpassRows = await query(`
    SELECT student_id FROM outpasses 
    WHERE branch_id = ? AND status IN ('OUT', 'APPROVED') AND DATE(requested_at) = DATE(?)
  `, [branchId, date]);
  const activeOutpasses = outpassRows.map((o: any) => o.student_id);

  const enrichedRecords = records.map((rec: any) => ({
    ...rec,
    isOnOutpass: activeOutpasses.includes(rec.student_id),
    status: activeOutpasses.includes(rec.student_id) && rec.status === 'PRESENT' ? 'OUTPASS' : rec.status
  }));

  return res.json({ date, records: enrichedRecords });
});

// 3. Mark Hostel Attendance
hostelRouter.post('/mark', authenticate, requireRoles('WARDEN', 'HEAD_WARDEN', 'ADMIN', 'PRINCIPAL'), async (req: AuthRequest, res: Response) => {
  const { date, time = '21:30', records } = req.body; // records: Array<{ student_id, room_id, status, remarks }>

  if (!date || !Array.isArray(records)) {
    return res.status(400).json({ error: 'date and records array are required.' });
  }

  await transaction(async (client) => {
    for (const r of records) {
      const id = 'ha-' + crypto.randomUUID();
      await client.query(`
        INSERT INTO hostel_attendance (id, date, time, student_id, room_id, status, warden_id, remarks)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT(date, student_id) DO UPDATE SET
          time = EXCLUDED.time,
          room_id = EXCLUDED.room_id,
          status = EXCLUDED.status,
          warden_id = EXCLUDED.warden_id,
          remarks = EXCLUDED.remarks
      `, [id, date, time, r.student_id, r.room_id, r.status, req.user!.id, r.remarks || '']);
    }
  });

  logAudit(req, 'HOSTEL_ATTENDANCE_RECORDED', 'hostel_attendance', date, {
    totalRecords: records.length,
    warden: req.user!.name
  });

  return res.json({ success: true, message: 'Hostel attendance recorded successfully.' });
});

// 4. Hostel Attendance Reports & History
hostelRouter.get('/reports', authenticate, async (req: AuthRequest, res: Response) => {
  const branchId = (req.query.branch_id as string) || req.user!.branch_id;
  const startDate = (req.query.start_date as string) || '2026-09-01';
  const endDate = (req.query.end_date as string) || '2026-09-30';
  const studentId = req.query.student_id as string;

  let sql = `
    SELECT ha.*, sp.name as student_name, sp.register_number,
           hr.room_number, hr.floor, hb.name as block_name,
           u_w.name as warden_name
    FROM hostel_attendance ha
    JOIN student_profiles sp ON ha.student_id = sp.id
    JOIN hostel_rooms hr ON ha.room_id = hr.id
    JOIN hostel_blocks hb ON hr.block_id = hb.id
    JOIN hostels h ON hb.hostel_id = h.id
    LEFT JOIN users u_w ON ha.warden_id = u_w.id
    WHERE h.branch_id = ? AND ha.date BETWEEN ? AND ?
  `;
  const params: any[] = [branchId, startDate, endDate];

  if (studentId) {
    sql += ` AND ha.student_id = ?`;
    params.push(studentId);
  }

  sql += ` ORDER BY ha.date DESC, hr.room_number ASC`;

  const report = await query(sql, params);

  return res.json({
    summary: {
      total: report.length,
      present: report.filter((r: any) => r.status === 'PRESENT').length,
      absent: report.filter((r: any) => r.status === 'ABSENT').length,
      outpass: report.filter((r: any) => r.status === 'OUTPASS').length,
      leave: report.filter((r: any) => r.status === 'LEAVE').length,
      medical: report.filter((r: any) => r.status === 'MEDICAL').length,
      lateReturn: report.filter((r: any) => r.status === 'LATE_RETURN').length
    },
    report
  });
});

// 5. Self-service: the logged-in student's own room — their bed, room,
//    block, hostel, and roommates (other students sharing the same room).
//    No existing endpoint scoped this to "my own room" (hierarchy/attendance
//    both return the whole branch), so students need a narrow, safe read.
hostelRouter.get('/my-room', authenticate, async (req: AuthRequest, res: Response) => {
  const studentId = (req.query.student_id as string) || req.user!.student_id;
  if (!studentId) {
    return res.status(400).json({ error: 'No student profile linked to this account.' });
  }
  if (req.user!.role === 'STUDENT' && req.user!.student_id !== studentId) {
    return res.status(403).json({ error: 'Access denied: you can only view your own room.' });
  }

  const myBed = await queryOne<any>(`
    SELECT hbed.id as bed_id, hbed.bed_number, hr.id as room_id, hr.room_number, hr.floor, hr.capacity,
           hbl.id as block_id, hbl.name as block_name, h.id as hostel_id, h.name as hostel_name, h.type as hostel_type
    FROM hostel_beds hbed
    JOIN hostel_rooms hr ON hbed.room_id = hr.id
    JOIN hostel_blocks hbl ON hr.block_id = hbl.id
    JOIN hostels h ON hbl.hostel_id = h.id
    WHERE hbed.student_id = ?
  `, [studentId]);

  if (!myBed) {
    return res.json({ allotted: false, room: null, roommates: [] });
  }

  const roommates = await query(`
    SELECT hbed.bed_number, sp.id as student_id, sp.name, sp.register_number, sp.photo_url, sp.phone
    FROM hostel_beds hbed
    JOIN student_profiles sp ON hbed.student_id = sp.id
    WHERE hbed.room_id = ? AND hbed.student_id != ?
    ORDER BY hbed.bed_number ASC
  `, [myBed.room_id, studentId]);

  const cleaningSchedule = await query(`
    SELECT day_of_week, task, time_slot FROM hostel_cleaning_schedule
    WHERE block_id = ?
    ORDER BY CASE day_of_week
      WHEN 'Monday' THEN 1 WHEN 'Tuesday' THEN 2 WHEN 'Wednesday' THEN 3
      WHEN 'Thursday' THEN 4 WHEN 'Friday' THEN 5 WHEN 'Saturday' THEN 6 ELSE 7
    END
  `, [myBed.block_id]).catch(() => []); // table may not exist until the migration is run

  return res.json({ allotted: true, room: myBed, roommates, cleaningSchedule });
});

// 6. Maintenance requests — a resident student reports a cleaning/repair
//    issue in their own room; Warden/Head Warden/Admin triage and resolve.
hostelRouter.post('/maintenance', authenticate, async (req: AuthRequest, res: Response) => {
  const { category, description } = req.body;
  const studentId = req.user!.student_id;
  if (!studentId) {
    return res.status(403).json({ error: 'Only a student account can file a room maintenance request.' });
  }
  if (!description) {
    return res.status(400).json({ error: 'description is required.' });
  }

  const myBed = await queryOne<any>(`SELECT room_id FROM hostel_beds WHERE student_id = ?`, [studentId]);
  if (!myBed) {
    return res.status(400).json({ error: 'You are not currently allotted a hostel room.' });
  }

  const student = await queryOne<any>(`SELECT branch_id FROM student_profiles WHERE id = ?`, [studentId]);
  const id = 'hmr-' + crypto.randomUUID();
  await execute(`
    INSERT INTO hostel_maintenance_requests (id, branch_id, student_id, room_id, category, description, status)
    VALUES (?, ?, ?, ?, ?, ?, 'OPEN')
  `, [id, student?.branch_id || req.user!.branch_id, studentId, myBed.room_id, category || 'MAINTENANCE', description]);

  logAudit(req, 'HOSTEL_MAINTENANCE_REQUESTED', 'hostel_maintenance_requests', id, { category, room_id: myBed.room_id });

  return res.status(201).json({ success: true, id, message: 'Maintenance request submitted to the Warden.' });
});

// 6b. A student's own maintenance request history.
hostelRouter.get('/maintenance/mine', authenticate, async (req: AuthRequest, res: Response) => {
  const studentId = (req.query.student_id as string) || req.user!.student_id;
  if (!studentId) {
    return res.status(400).json({ error: 'No student profile linked to this account.' });
  }
  if (req.user!.role === 'STUDENT' && req.user!.student_id !== studentId) {
    return res.status(403).json({ error: 'Access denied: you can only view your own requests.' });
  }
  const requests = await query(`
    SELECT hmr.*, hr.room_number
    FROM hostel_maintenance_requests hmr
    JOIN hostel_rooms hr ON hmr.room_id = hr.id
    WHERE hmr.student_id = ?
    ORDER BY hmr.created_at DESC
  `, [studentId]);
  return res.json({ requests });
});

// 6c. Branch-wide maintenance request queue, for Warden/Head Warden/Admin.
hostelRouter.get('/maintenance', authenticate, requireRoles('WARDEN', 'HEAD_WARDEN', 'ADMIN', 'PRINCIPAL'), async (req: AuthRequest, res: Response) => {
  const branchId = (req.query.branch_id as string) || req.user!.branch_id;
  const status = req.query.status as string;
  let sql = `
    SELECT hmr.*, hr.room_number, hbl.name as block_name, sp.name as student_name, sp.register_number
    FROM hostel_maintenance_requests hmr
    JOIN hostel_rooms hr ON hmr.room_id = hr.id
    JOIN hostel_blocks hbl ON hr.block_id = hbl.id
    JOIN student_profiles sp ON hmr.student_id = sp.id
    WHERE hmr.branch_id = ?
  `;
  const params: any[] = [branchId];
  if (status) {
    sql += ` AND hmr.status = ?`;
    params.push(status);
  }
  sql += ` ORDER BY hmr.created_at DESC`;
  const requests = await query(sql, params);
  return res.json({ requests });
});

// 6d. Resolve / update a maintenance request's status.
hostelRouter.put('/maintenance/:id', authenticate, requireRoles('WARDEN', 'HEAD_WARDEN', 'ADMIN', 'PRINCIPAL'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!['OPEN', 'IN_PROGRESS', 'RESOLVED'].includes(status)) {
    return res.status(400).json({ error: 'status must be OPEN, IN_PROGRESS or RESOLVED.' });
  }
  await execute(`
    UPDATE hostel_maintenance_requests
    SET status = ?, resolved_at = CASE WHEN ? = 'RESOLVED' THEN CURRENT_TIMESTAMP ELSE resolved_at END
    WHERE id = ?
  `, [status, status, id]);
  logAudit(req, 'HOSTEL_MAINTENANCE_UPDATED', 'hostel_maintenance_requests', id, { status });
  return res.json({ success: true, message: 'Maintenance request updated.' });
});
