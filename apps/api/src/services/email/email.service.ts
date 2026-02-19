import { Resend } from 'resend';
import { env } from '../../config/env';
import { logger } from '../../lib/logger';

let _resend: Resend | null = null;

function getResend(): Resend {
  if (!_resend) {
    if (!env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not configured');
    }
    _resend = new Resend(env.RESEND_API_KEY);
  }
  return _resend;
}

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  if (!env.RESEND_API_KEY) {
    // Dev/test mode: log the link instead of sending
    logger.warn({ to, resetUrl }, '[Email] RESEND_API_KEY not set — password reset link logged here instead of emailed');
    return;
  }

  const resend = getResend();

  const { error } = await resend.emails.send({
    from: env.EMAIL_FROM,
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

  if (error) {
    // Log but do NOT rethrow — the route always returns the same generic response
    // to prevent timing-based email enumeration
    logger.error({ error, to }, 'Failed to send password reset email via Resend');
  } else {
    logger.info({ to }, 'Password reset email sent');
  }
}
