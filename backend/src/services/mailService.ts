import { env } from "../config/env.js";

export interface SentEmailLog {
  to: string;
  subject: string;
  otp: string;
  sentAt: Date;
}

export class MailService {
  public outbox: SentEmailLog[] = [];

  async sendOtpEmail(to: string, otp: string): Promise<void> {
    this.outbox.push({ to, subject: "VAKHYA Password Recovery OTP", otp, sentAt: new Date() });

    if (!env.smtpHost || !env.smtpUser) {
      console.log(`[VAKHYA Mail] Dev OTP for ${to}: ${otp}`);
      return;
    }

    try {
      const mailerPkg = "nodemailer";
      const nodemailer = await import(/* @vite-ignore */ mailerPkg);
      const transporter = nodemailer.createTransport({
        host: env.smtpHost,
        port: env.smtpPort,
        secure: env.smtpPort === 465,
        auth: { user: env.smtpUser, pass: env.smtpPass },
      });
      await transporter.sendMail({
        from: env.smtpFrom,
        to,
        subject: "VAKHYA Password Recovery OTP",
        text: `Your VAKHYA password recovery verification code is: ${otp}. It expires in 10 minutes.`,
      });
    } catch (err: any) {
      console.warn("[VAKHYA Mail] SMTP delivery warning:", err?.message || err);
    }
  }
}

export const mailService = new MailService();
