import { Router, Request, Response, NextFunction } from 'express';
import { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } from '@whatsapp-bot/shared';
import * as authService from '../services/auth/auth.service';
import { requireAuth } from '../middleware/requireAuth';
import { authLimiter, forgotPasswordLimiter } from '../middleware/rateLimiter';
import { signToken, signRefreshToken, verifyRefreshToken } from '../lib/jwt.util';
import { UnauthorizedError } from '../middleware/errorHandler';

const router = Router();

router.post('/auth/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = registerSchema.parse(req.body);
    const result = await authService.registerOwner(input);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

router.post('/auth/login', authLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = loginSchema.parse(req.body);
    const result = await authService.login(input);
    // Also issue refresh token alongside the access token
    const refreshToken = signRefreshToken({
      userId: result.user.id,
      tenantId: result.tenant.id,
      role: result.user.role,
    });
    res.json({ success: true, data: { ...result, refreshToken } });
  } catch (err) {
    next(err);
  }
});

router.post('/auth/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) throw new UnauthorizedError('Refresh token required');

    const payload = verifyRefreshToken(refreshToken);
    const accessToken = signToken({
      userId: payload.userId,
      tenantId: payload.tenantId,
      role: payload.role,
    });
    res.json({ success: true, data: { accessToken } });
  } catch (err) {
    next(new UnauthorizedError('Invalid or expired refresh token'));
  }
});

router.get('/auth/me', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await authService.getMe(req.auth!.userId, req.auth!.tenantId);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// POST /auth/forgot-password — request a password reset link (no auth required)
router.post('/auth/forgot-password', forgotPasswordLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = forgotPasswordSchema.parse(req.body);
    await authService.requestPasswordReset(input);
    // Always return 200 with a generic message — no email enumeration
    res.json({
      success: true,
      data: { message: "If that email exists, you'll receive a reset link shortly." },
    });
  } catch (err) {
    next(err);
  }
});

// POST /auth/reset-password — apply new password using reset token (no auth required)
router.post('/auth/reset-password', authLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = resetPasswordSchema.parse(req.body);
    await authService.resetPassword(input);
    res.json({
      success: true,
      data: { message: 'Password reset successfully. You can now sign in.' },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
