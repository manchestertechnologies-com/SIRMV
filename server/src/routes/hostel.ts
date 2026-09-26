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
    SELECT hbed.*, sp.name as student_name, sp.register_number, sp.photo_url, sp.phone as student_phone,
           c.name as class_name, sec.name as section_name, b.name as batch_name
    FROM hostel_beds hbed
    LEFT JOIN student_profiles sp ON hbed.student_id = sp.id
    LEFT JOIN classes c ON sp.class_id = c.id
    LEFT JOIN sections sec ON sp.section_id = sec.id
    LEFT JOIN batches b ON sp.batch_id = b.id
  `);

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

