import crypto from 'crypto';
import { db } from '../database/db';

export interface SMSProvider {
  sendSMS(phone: string, message: string): Promise<boolean>;
}

// Development SMS Provider implementation (Logs and stores for simulation)
class ConsoleSMSProvider implements SMSProvider {
  async sendSMS(phone: string, message: string): Promise<boolean> {
    console.log(`[SMS PROVIDER SIMULATION] To: ${phone} | Content: "${message}"`);
    return true;
  }
}

const smsProvider: SMSProvider = new ConsoleSMSProvider();

export const otpService = {
  // Generate a random 6-digit OTP
  generateOTP(outpassId: string): string {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 mins validity

    const id = 'otp-' + crypto.randomUUID();
    db.prepare(`
      INSERT INTO outpass_otps (id, outpass_id, otp_code, expires_at)
      VALUES (?, ?, ?, ?)
    `).run(id, outpassId, otp, expiresAt);

    return otp;
  },

  // Send OTP to Parent Phone
  async sendParentOTP(outpassId: string, parentPhone: string, studentName: string): Promise<{ success: boolean; simulatedOtp?: string }> {
    const otp = this.generateOTP(outpassId);
    const message = `SIR MV PU College: Security Outpass OTP for ${studentName} is ${otp}. Valid for 15 minutes. Do not share with unknown persons.`;
    
    await smsProvider.sendSMS(parentPhone, message);
    return { success: true, simulatedOtp: otp };
  },

  // Verify OTP
  verifyOTP(outpassId: string, enteredCode: string): { success: boolean; message: string } {
    const record = db.prepare(`
      SELECT * FROM outpass_otps 
      WHERE outpass_id = ? AND verified_at IS NULL
      ORDER BY expires_at DESC LIMIT 1
    `).get(outpassId) as { id: string; otp_code: string; expires_at: string } | undefined;

    if (!record) {
      return { success: false, message: 'No active OTP found. Please request a new OTP.' };
    }

    if (new Date(record.expires_at) < new Date()) {
      return { success: false, message: 'OTP has expired. Please request a new one.' };
    }

    if (record.otp_code !== enteredCode.trim()) {
      return { success: false, message: 'Invalid OTP code entered.' };
    }

    // Mark as verified
    db.prepare(`UPDATE outpass_otps SET verified_at = CURRENT_TIMESTAMP WHERE id = ?`).run(record.id);
    db.prepare(`UPDATE outpasses SET parent_otp_verified = 1, parent_verified_at = CURRENT_TIMESTAMP WHERE id = ?`).run(outpassId);

    return { success: true, message: 'Parent verification successful.' };
  },

  // Generate 4-digit non-predictable outpass gate verification code
  generate4DigitOutpassCode(): string {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }
};
