import nodemailer from 'nodemailer';
import { env } from '../../config/env';
import { logger } from '../../lib/logger';

let _transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (!_transporter) {
    _transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
    });
  }
  return _transporter;
}

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  if (!env.SMTP_USER || !env.SMTP_PASS) {
    logger.warn({ to, resetUrl }, '[Email] SMTP_USER/SMTP_PASS not set — password reset link logged here instead of emailed');
    return;
  }

  const from = env.EMAIL_FROM || env.SMTP_USER;

  try {
    await getTransporter().sendMail({
      from,
      to,
      subject: 'Reset your password',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
          <h2 style="margin-bottom:8px">Reset your password</h2>
          <p style="color:#555">You requested a password reset for your WhatsApp Bot Dashboard account.</p>
          <p style="margin:24px 0">
            <a href="${resetUrl}"
               style="background:#2563eb;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block">
              Reset Password
            </a>
          </p>
          <p style="color:#888;font-size:13px">This link expires in 1 hour. If you did not request this, you can safely ignore this email.</p>
          <p style="color:#aaa;font-size:12px;margin-top:24px">Or copy this link: ${resetUrl}</p>
        </div>
      `,
    });
    logger.info({ to }, 'Password reset email sent');
  } catch (err) {
    // Log but do NOT rethrow — the route always returns the same generic response
    // to prevent timing-based email enumeration
    logger.error({ err, to }, 'Failed to send password reset email via Gmail SMTP');
  }
}
