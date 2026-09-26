import { Router, Response } from 'express';
import { query, queryOne, execute } from '../database/pgDb';
import { authenticate, AuthRequest, requireRoles } from '../middleware/auth';
import { logAudit } from '../middleware/audit';
import { otpService } from '../services/otpService';
import crypto from 'crypto';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

export const outpassRouter = Router();

// Configure storage for pickup photos
const pickupPhotosDir = path.join(__dirname, '..', '..', 'uploads', 'pickup_photos');
if (!fs.existsSync(pickupPhotosDir)) {
  fs.mkdirSync(pickupPhotosDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, pickupPhotosDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'pickup-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// Upload Pickup Person Photo (from Camera Capture or File)
outpassRouter.post('/upload-photo', authenticate, upload.single('photo'), (req: AuthRequest, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No photo captured or uploaded.' });
  }
  const photoUrl = `/uploads/pickup_photos/${req.file.filename}`;
  return res.json({ success: true, photoUrl });
});

// 1. Create Outpass Request (with Pickup details & Photo)
outpassRouter.post('/request', authenticate, async (req: AuthRequest, res: Response) => {
  const {
    student_id,
    reason,
    pickup_person_name,
    pickup_person_phone,
    relationship,
    id_type = 'Aadhaar Card',
    id_number,
    pickup_photo_url,
    parent_phone
  } = req.body;

  if (!student_id || !reason || !pickup_person_name || !pickup_person_phone || !relationship) {
    return res.status(400).json({ error: 'Please provide all required pickup person and student details.' });
  }

  // Get student details
  const student = await queryOne(`SELECT * FROM student_profiles WHERE id = ?`, [student_id]);
  if (!student) {
    return res.status(404).json({ error: 'Student profile not found.' });
  }

  const outpassId = 'op-' + crypto.randomUUID();
  const dateStamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = Math.floor(100 + Math.random() * 900);
  const outpassNumber = `OP-${dateStamp}-${randomSuffix}`;
  const resolvedParentPhone = parent_phone || student.parent_phone;
  const branchId = student.branch_id || req.user!.branch_id;

  // Generate initial verification code (becomes active upon Principal approval)
  const verificationCode = otpService.generate4DigitOutpassCode();

  await execute(`
    INSERT INTO outpasses (
      id, outpass_number, branch_id, student_id, reason, pickup_person_name,
      pickup_person_phone, relationship, id_type, id_number, pickup_photo_url,
      parent_phone, parent_otp_verified, verification_code, status, requested_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 'PENDING', CURRENT_TIMESTAMP)
  `, [
    outpassId, outpassNumber, branchId, student_id, reason, pickup_person_name,
    pickup_person_phone, relationship, id_type, id_number || null, pickup_photo_url || null,
    resolvedParentPhone, verificationCode
  ]);

  logAudit(req, 'OUTPASS_REQUESTED', 'outpasses', outpassId, {
    outpassNumber,
    student: student.name,
    pickup: pickup_person_name,
    parent_phone: resolvedParentPhone
  });

  return res.json({
    success: true,
    message: 'Outpass request created. Proceed to Parent OTP Verification.',
    outpassId,
    outpassNumber,
    parentPhone: resolvedParentPhone
  });
});

// 2. Send Parent OTP
outpassRouter.post('/:id/send-otp', authenticate, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const outpass = await queryOne(`
    SELECT op.*, sp.name as student_name 
    FROM outpasses op
    JOIN student_profiles sp ON op.student_id = sp.id
    WHERE op.id = ?
  `, [id]);

  if (!outpass) {
    return res.status(404).json({ error: 'Outpass not found.' });
  }

  const result = await otpService.sendParentOTP(id, outpass.parent_phone, outpass.student_name);

  logAudit(req, 'PARENT_OTP_SENT', 'outpasses', id, {
    parent_phone: outpass.parent_phone,
    student: outpass.student_name
  });

  return res.json({
    success: true,
    message: `OTP sent to registered parent mobile (${outpass.parent_phone.slice(0, 3)}****${outpass.parent_phone.slice(-3)})`,
    simulatedOtp: result.simulatedOtp // provided for smooth local testing
  });
});

// 3. Verify Parent OTP
outpassRouter.post('/:id/verify-otp', authenticate, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { otp } = req.body;

  if (!otp) {
    return res.status(400).json({ error: 'OTP is required.' });
  }

  const result = otpService.verifyOTP(id, otp);
  if (!result.success) {
    return res.status(400).json({ error: result.message });
  }

  logAudit(req, 'PARENT_OTP_VERIFIED', 'outpasses', id, { verified: true });

  return res.json({
    success: true,
    message: 'Parent OTP successfully verified. Outpass forwarded to Principal for approval.'
  });
});

// 4. Principal Pending Outpass Queue
outpassRouter.get('/pending-principal', authenticate, requireRoles('PRINCIPAL', 'ADMIN', 'HOD'), async (req: AuthRequest, res: Response) => {
  const branchId = (req.query.branch_id as string) || req.user!.branch_id;

  const pendingOutpasses = await query(`
    SELECT op.*, sp.name as student_name, sp.register_number, sp.photo_url as student_photo,
           c.name as class_name, sec.name as section_name, b.name as batch_name,
           br.name as branch_name, br.principal_name
    FROM outpasses op
    JOIN student_profiles sp ON op.student_id = sp.id
    JOIN classes c ON sp.class_id = c.id
    JOIN sections sec ON sp.section_id = sec.id
    JOIN batches b ON sp.batch_id = b.id
    JOIN branches br ON op.branch_id = br.id
    WHERE op.branch_id = ? AND op.status = 'PENDING'
    ORDER BY op.requested_at DESC
  `, [branchId]);

  return res.json({ pendingOutpasses });
});

// 5. Principal Approval / Rejection
outpassRouter.post('/:id/approve', authenticate, requireRoles('PRINCIPAL', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const principalId = req.user!.id;
  const principalName = req.user!.name;

  const outpass = await queryOne(`SELECT * FROM outpasses WHERE id = ?`, [id]);
  if (!outpass) {
    return res.status(404).json({ error: 'Outpass not found.' });
  }

  const digitalSignatureHash = `SIG_DIGITAL_PRINCIPAL_${principalId.slice(0, 8)}_${outpass.verification_code}_${Date.now()}`;

  await execute(`
    UPDATE outpasses SET
      status = 'APPROVED',
      approved_by = ?,
      approved_at = CURRENT_TIMESTAMP,
      digital_signature_hash = ?
    WHERE id = ?
  `, [principalId, digitalSignatureHash, id]);

  logAudit(req, 'OUTPASS_APPROVED', 'outpasses', id, {
    outpassNumber: outpass.outpass_number,
    approvedBy: principalName,
    verificationCode: outpass.verification_code
  });

  return res.json({
    success: true,
    message: `Outpass ${outpass.outpass_number} approved. Verification Code: ${outpass.verification_code}`,
    verificationCode: outpass.verification_code,
    digitalSignatureHash
  });
});

outpassRouter.post('/:id/reject', authenticate, requireRoles('PRINCIPAL', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { reason } = req.body;
  const principalId = req.user!.id;

  await execute(`
    UPDATE outpasses SET
      status = 'REJECTED',
      approved_by = ?,
      approved_at = CURRENT_TIMESTAMP,
      rejection_reason = ?
    WHERE id = ?
  `, [principalId, reason || 'Rejected by Principal', id]);

  logAudit(req, 'OUTPASS_REJECTED', 'outpasses', id, { rejection_reason: reason });

  return res.json({ success: true, message: 'Outpass has been rejected.' });
});

// 6. Gate Staff Instant Search & Verification (by Outpass Number OR 4-digit code)
outpassRouter.get('/gate-verify/:query', authenticate, requireRoles('GATE_STAFF', 'ADMIN', 'PRINCIPAL', 'WARDEN', 'HEAD_WARDEN'), async (req: AuthRequest, res: Response) => {
  const { query: searchQuery } = req.params;
  const branchId = (req.query.branch_id as string) || req.user!.branch_id;

  const outpass = await queryOne(`
    SELECT op.*, sp.name as student_name, sp.register_number, sp.photo_url as student_photo,
           sp.gender, sp.phone as student_phone,
           c.name as class_name, sec.name as section_name, b.name as batch_name,
           u_appr.name as approved_by_name,
           u_exit.name as exit_gate_staff_name,
           u_ret.name as return_gate_staff_name,
           br.name as branch_name, br.city as branch_city, br.principal_name
    FROM outpasses op
    JOIN student_profiles sp ON op.student_id = sp.id
    JOIN classes c ON sp.class_id = c.id
    JOIN sections sec ON sp.section_id = sec.id
    JOIN batches b ON sp.batch_id = b.id
    JOIN branches br ON op.branch_id = br.id
    LEFT JOIN users u_appr ON op.approved_by = u_appr.id
    LEFT JOIN users u_exit ON op.exit_gate_staff_id = u_exit.id
    LEFT JOIN users u_ret ON op.return_gate_staff_id = u_ret.id
    WHERE op.branch_id = ? AND (op.outpass_number = ? OR op.verification_code = ? OR op.id = ?)
  `, [branchId, searchQuery.trim(), searchQuery.trim(), searchQuery.trim()]);

  if (!outpass) {
    return res.status(404).json({ error: 'No matching outpass found with this code or number.' });
  }

  return res.json({ outpass });
});

// 7. Gate Staff Record Exit
outpassRouter.post('/:id/record-exit', authenticate, requireRoles('GATE_STAFF', 'ADMIN', 'PRINCIPAL'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const gateStaffId = req.user!.id;

  const outpass = await queryOne(`SELECT * FROM outpasses WHERE id = ?`, [id]);
  if (!outpass) {
    return res.status(404).json({ error: 'Outpass not found.' });
  }
  if (outpass.status !== 'APPROVED') {
    return res.status(400).json({ error: `Cannot exit. Outpass status is ${outpass.status}` });
  }

  await execute(`
    UPDATE outpasses SET
      status = 'OUT',
      exit_time = CURRENT_TIMESTAMP,
      exit_gate_staff_id = ?
    WHERE id = ?
  `, [gateStaffId, id]);

  logAudit(req, 'GATE_EXIT_RECORDED', 'outpasses', id, {
    outpassNumber: outpass.outpass_number,
    gateStaff: req.user!.name
  });

  return res.json({ success: true, message: 'Student exit recorded successfully.' });
});

// 8. Gate Staff Record Return
outpassRouter.post('/:id/record-return', authenticate, requireRoles('GATE_STAFF', 'ADMIN', 'PRINCIPAL', 'WARDEN', 'HEAD_WARDEN'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const gateStaffId = req.user!.id;

  const outpass = await queryOne(`SELECT * FROM outpasses WHERE id = ?`, [id]);
  if (!outpass) {
    return res.status(404).json({ error: 'Outpass not found.' });
  }
  if (outpass.status !== 'OUT') {
    return res.status(400).json({ error: `Cannot record return. Outpass status is currently ${outpass.status}` });
  }

  await execute(`
    UPDATE outpasses SET
      status = 'RETURNED',
      return_time = CURRENT_TIMESTAMP,
      return_gate_staff_id = ?
    WHERE id = ?
  `, [gateStaffId, id]);

  logAudit(req, 'GATE_RETURN_RECORDED', 'outpasses', id, {
    outpassNumber: outpass.outpass_number,
    gateStaff: req.user!.name
  });

  return res.json({ success: true, message: 'Student return recorded successfully.' });
});

// 9. Principal Outpass Register (Today's Outpasses & Historical Filter)
outpassRouter.get('/register', authenticate, async (req: AuthRequest, res: Response) => {
  const branchId = (req.query.branch_id as string) || req.user!.branch_id;
  const status = req.query.status as string;
  const date = req.query.date as string;
  const classId = req.query.class_id as string;
  const search = req.query.search as string;

  let sql = `
    SELECT op.*, sp.name as student_name, sp.register_number, sp.photo_url as student_photo,
           c.name as class_name, sec.name as section_name, b.name as batch_name,
           u_appr.name as approved_by_name,
           u_exit.name as exit_gate_staff_name,
           u_ret.name as return_gate_staff_name
    FROM outpasses op
    JOIN student_profiles sp ON op.student_id = sp.id
    JOIN classes c ON sp.class_id = c.id
    JOIN sections sec ON sp.section_id = sec.id
    JOIN batches b ON sp.batch_id = b.id
    LEFT JOIN users u_appr ON op.approved_by = u_appr.id
    LEFT JOIN users u_exit ON op.exit_gate_staff_id = u_exit.id
    LEFT JOIN users u_ret ON op.return_gate_staff_id = u_ret.id
    WHERE op.branch_id = ?
  `;
  const params: any[] = [branchId];

  if (status && status !== 'ALL') {
    sql += ` AND op.status = ?`;
    params.push(status);
  }
  if (date) {
    sql += ` AND DATE(op.requested_at) = DATE(?)`;
    params.push(date);
  }
  if (classId) {
    sql += ` AND sp.class_id = ?`;
    params.push(classId);
  }
  if (search) {
    sql += ` AND (sp.name LIKE ? OR sp.register_number LIKE ? OR op.outpass_number LIKE ?)`;
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  sql += ` ORDER BY op.requested_at DESC LIMIT 100`;

  const outpasses = await query(sql, params);

  // Status breakdown metrics
  const counts = {
    total: outpasses.length,
    pending: outpasses.filter((o: any) => o.status === 'PENDING').length,
    approved: outpasses.filter((o: any) => o.status === 'APPROVED').length,
    out: outpasses.filter((o: any) => o.status === 'OUT').length,
    returned: outpasses.filter((o: any) => o.status === 'RETURNED').length,
    rejected: outpasses.filter((o: any) => o.status === 'REJECTED').length
  };

  return res.json({ counts, outpasses });
});

// 10. Student Outpass History
outpassRouter.get('/student/:studentId', authenticate, async (req: AuthRequest, res: Response) => {
  const { studentId } = req.params;

  // Authorization check for Student / Parent
  if (req.user!.role === 'STUDENT' && req.user!.student_id !== studentId) {
    return res.status(403).json({ error: 'Unauthorized to view another student outpass history.' });
  }

  const history = await query(`
    SELECT op.*, u_appr.name as approved_by_name, u_exit.name as exit_staff_name, u_ret.name as return_staff_name
    FROM outpasses op
    LEFT JOIN users u_appr ON op.approved_by = u_appr.id
    LEFT JOIN users u_exit ON op.exit_gate_staff_id = u_exit.id
    LEFT JOIN users u_ret ON op.return_gate_staff_id = u_ret.id
    WHERE op.student_id = ?
    ORDER BY op.requested_at DESC
  `, [studentId]);

  return res.json({ history });
});

// 11. Printable Outpass Data
outpassRouter.get('/:id/print', authenticate, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const outpass = await queryOne(`
    SELECT op.*, sp.name as student_name, sp.register_number, sp.photo_url as student_photo,
           sp.gender, sp.phone as student_phone,
           c.name as class_name, sec.name as section_name, b.name as batch_name,
           u_appr.name as principal_name,
           u_exit.name as exit_gate_staff_name,
           u_ret.name as return_gate_staff_name,
           br.name as college_name, br.address as college_address, br.phone as college_phone,
           br.email as college_email, br.city as college_city, br.principal_name as branch_principal
    FROM outpasses op
    JOIN student_profiles sp ON op.student_id = sp.id
    JOIN classes c ON sp.class_id = c.id
    JOIN sections sec ON sp.section_id = sec.id
    JOIN batches b ON sp.batch_id = b.id
    JOIN branches br ON op.branch_id = br.id
    LEFT JOIN users u_appr ON op.approved_by = u_appr.id
    LEFT JOIN users u_exit ON op.exit_gate_staff_id = u_exit.id
    LEFT JOIN users u_ret ON op.return_gate_staff_id = u_ret.id
    WHERE op.id = ?
  `, [id]);

  if (!outpass) {
    return res.status(404).json({ error: 'Outpass record not found.' });
  }

  return res.json({ outpass });
});

