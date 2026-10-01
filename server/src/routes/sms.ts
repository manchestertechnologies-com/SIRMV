import { Router, Response } from 'express';
import { query, queryOne } from '../database/pgDb';
import { authenticate, AuthRequest, requireRoles } from '../middleware/auth';
import { smsService } from '../services/smsService';

export const smsRouter = Router();

const ADMIN_ROLES = ['ADMIN', 'PRINCIPAL'] as const;

// Recent SMS history for the branch (automated + manual).
smsRouter.get('/logs', authenticate, requireRoles(...ADMIN_ROLES), async (req: AuthRequest, res: Response) => {
  try {
    const branchId = (req.query.branch_id as string) || req.user!.branch_id;
    const limit = Math.min(parseInt((req.query.limit as string) || '100', 10) || 100, 300);

    const logs = await query(
      `SELECT l.*, u.name as sent_by_name
       FROM sms_logs l
       LEFT JOIN users u ON l.sent_by = u.id
       WHERE l.branch_id = ?
       ORDER BY l.sent_at DESC
       LIMIT ?`,
      [branchId, limit]
    );
    return res.json({ logs });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Workflow toggles for the branch.
smsRouter.get('/workflows', authenticate, requireRoles(...ADMIN_ROLES), async (req: AuthRequest, res: Response) => {
  try {
    const branchId = (req.query.branch_id as string) || req.user!.branch_id;
    const workflows = await smsService.listWorkflows(branchId);
    return res.json({ workflows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

smsRouter.put('/workflows/:triggerKey', authenticate, requireRoles(...ADMIN_ROLES), async (req: AuthRequest, res: Response) => {
  try {
    const { triggerKey } = req.params;
    const { is_enabled } = req.body;
    const branchId = (req.body.branch_id as string) || req.user!.branch_id;
    if (typeof is_enabled !== 'boolean') {
      return res.status(400).json({ error: 'is_enabled (boolean) is required.' });
    }
    await smsService.setWorkflowEnabled(branchId, triggerKey, is_enabled);
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Manual SMS: to one student's parent, to a whole class/section's parents, or
// to a free-typed phone number.
smsRouter.post('/send', authenticate, requireRoles('ADMIN', 'PRINCIPAL', 'WARDEN', 'HEAD_WARDEN', 'TEACHER', 'HOD'), async (req: AuthRequest, res: Response) => {
  try {
    const { to, student_id, class_id, section_id, phone, message } = req.body as {
      to: 'STUDENT' | 'CLASS' | 'CUSTOM';
      student_id?: string;
      class_id?: string;
      section_id?: string;
      phone?: string;
      message?: string;
    };
    const branchId = req.user!.branch_id;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'message is required.' });
    }

    let recipients: Array<{ phone: string; name: string }> = [];

    if (to === 'STUDENT') {
      if (!student_id) return res.status(400).json({ error: 'student_id is required.' });
      const student = await queryOne<any>(
        `SELECT name, parent_phone, parent_name FROM student_profiles WHERE id = ? AND branch_id = ?`,
        [student_id, branchId]
      );
      if (!student) return res.status(404).json({ error: 'Student not found.' });
      if (student.parent_phone) {
        recipients.push({ phone: student.parent_phone, name: `${student.parent_name || 'Parent'} (${student.name})` });
      }
    } else if (to === 'CLASS') {
      if (!class_id) return res.status(400).json({ error: 'class_id is required.' });
      const students = await query<any>(
        `SELECT name, parent_phone, parent_name FROM student_profiles
         WHERE branch_id = ? AND class_id = ? AND (? = '' OR section_id = ?) AND parent_phone IS NOT NULL`,
        [branchId, class_id, section_id || '', section_id || '']
      );
      recipients = students
        .filter((s) => !!s.parent_phone)
        .map((s) => ({ phone: s.parent_phone, name: `${s.parent_name || 'Parent'} (${s.name})` }));
    } else if (to === 'CUSTOM') {
      if (!phone) return res.status(400).json({ error: 'phone is required.' });
      recipients.push({ phone, name: 'Custom Recipient' });
    } else {
      return res.status(400).json({ error: "to must be one of 'STUDENT', 'CLASS', 'CUSTOM'." });
    }

    if (recipients.length === 0) {
      return res.status(400).json({ error: 'No recipients with a phone number on file were found.' });
    }

    let sentCount = 0;
    for (const r of recipients) {
      const result = await smsService.send({
        branchId,
        phone: r.phone,
        recipientName: r.name,
        message: message.trim(),
        trigger: 'MANUAL',
        sentBy: req.user!.id,
        skipWorkflowCheck: true
      });
      if (result.sent) sentCount++;
    }

    return res.json({ success: true, recipientsTargeted: recipients.length, sent: sentCount });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});
