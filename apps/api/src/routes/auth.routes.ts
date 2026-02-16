import { Router, Request, Response, NextFunction } from 'express';
import { registerSchema, loginSchema } from '@whatsapp-bot/shared';
import * as authService from '../services/auth/auth.service';
import { requireAuth } from '../middleware/requireAuth';

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

router.post('/auth/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = loginSchema.parse(req.body);
    const result = await authService.login(input);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
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

export default router;
