// Simulated SMS provider + workflow engine.
//
// Like otpService's ConsoleSMSProvider, no real SMS gateway is wired up —
// every "send" is logged to the console and recorded in sms_logs so the
// SMS workflow screen has a real history to show. Swap `ConsoleSmsProvider`
// for a real gateway client (Twilio, MSG91, etc.) when one is available;
// nothing else in this file or its callers needs to change.

import crypto from 'crypto';
import { query, queryOne, execute } from '../database/pgDb';

export interface SmsProvider {
  send(phone: string, message: string): Promise<boolean>;
}

class ConsoleSmsProvider implements SmsProvider {
  async send(phone: string, message: string): Promise<boolean> {
    console.log(`[SMS SIMULATION] To: ${phone} | "${message}"`);
    return true;
  }
}

const provider: SmsProvider = new ConsoleSmsProvider();

export type SmsTrigger =
  | 'ATTENDANCE_ABSENT'
  | 'OUTPASS_APPROVED'
  | 'OUTPASS_REJECTED'
  | 'OUTPASS_STUDENT_EXIT'
  | 'OUTPASS_STUDENT_RETURN'
  | 'GRIEVANCE_RESPONDED'
  | 'TEST_SCHEDULED'
  | 'MANUAL';

export const SMS_TRIGGER_LABELS: Record<Exclude<SmsTrigger, 'MANUAL'>, string> = {
  ATTENDANCE_ABSENT: 'Student Marked Absent',
  OUTPASS_APPROVED: 'Outpass Approved',
  OUTPASS_REJECTED: 'Outpass Rejected',
  OUTPASS_STUDENT_EXIT: 'Student Exited Campus (Outpass)',
  OUTPASS_STUDENT_RETURN: 'Student Returned to Campus (Outpass)',
  GRIEVANCE_RESPONDED: 'Hostel Grievance Responded',
  TEST_SCHEDULED: 'New Test/Exam Scheduled'
};

async function isTriggerEnabled(branchId: string, triggerKey: string): Promise<boolean> {
  const row = await queryOne<{ is_enabled: number }>(
    `SELECT is_enabled FROM sms_workflow_settings WHERE branch_id = ? AND trigger_key = ?`,
    [branchId, triggerKey]
  );
  // If the branch has no row for this trigger yet (migration not re-run after
  // a new trigger was added), default to enabled rather than silently dropping it.
  return row ? row.is_enabled === 1 : true;
}

interface SendOptions {
  branchId: string;
  phone: string;
  recipientName?: string;
  message: string;
  trigger: SmsTrigger;
  relatedEntityType?: string;
  relatedEntityId?: string;
  sentBy?: string | null; // null/undefined = automated
  skipWorkflowCheck?: boolean; // true for MANUAL sends, which aren't gated by a toggle
}

export const smsService = {
  /**
   * Sends (simulates) an SMS and logs it, honoring the branch's workflow
   * toggle for automated triggers. Manual sends always go through.
   */
  async send(opts: SendOptions): Promise<{ sent: boolean; reason?: string }> {
    if (!opts.phone) {
      return { sent: false, reason: 'No phone number on file.' };
    }

    if (!opts.skipWorkflowCheck && opts.trigger !== 'MANUAL') {
      const enabled = await isTriggerEnabled(opts.branchId, opts.trigger);
      if (!enabled) {
        return { sent: false, reason: 'Workflow disabled for this trigger.' };
      }
    }

    let ok = false;
    try {
      ok = await provider.send(opts.phone, opts.message);
    } catch {
      ok = false;
    }

    const id = 'sms-' + crypto.randomUUID();
    await execute(
      `INSERT INTO sms_logs (id, branch_id, recipient_phone, recipient_name, trigger_type, message, status, related_entity_type, related_entity_id, sent_by, sent_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [
        id,
        opts.branchId,
        opts.phone,
        opts.recipientName || null,
        opts.trigger,
        opts.message,
        ok ? 'SENT' : 'FAILED',
        opts.relatedEntityType || null,
        opts.relatedEntityId || null,
        opts.sentBy || null
      ]
    );

    return { sent: ok };
  },

  async listWorkflows(branchId: string) {
    const rows = await query<{ trigger_key: string; is_enabled: number }>(
      `SELECT trigger_key, is_enabled FROM sms_workflow_settings WHERE branch_id = ? ORDER BY trigger_key`,
      [branchId]
    );
    const byKey = new Map(rows.map((r) => [r.trigger_key, r.is_enabled === 1]));
    return (Object.keys(SMS_TRIGGER_LABELS) as Array<keyof typeof SMS_TRIGGER_LABELS>).map((key) => ({
      trigger_key: key,
      label: SMS_TRIGGER_LABELS[key],
      is_enabled: byKey.has(key) ? byKey.get(key)! : true
    }));
  },

  async setWorkflowEnabled(branchId: string, triggerKey: string, isEnabled: boolean) {
    const id = `${branchId}-${triggerKey}`;
    await execute(
      `INSERT INTO sms_workflow_settings (id, branch_id, trigger_key, is_enabled)
       VALUES (?, ?, ?, ?)
       ON CONFLICT (branch_id, trigger_key) DO UPDATE SET is_enabled = EXCLUDED.is_enabled`,
      [id, branchId, triggerKey, isEnabled ? 1 : 0]
    );
  }
};
