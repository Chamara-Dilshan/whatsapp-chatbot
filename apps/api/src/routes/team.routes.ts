import { Router, Request, Response, NextFunction } from 'express';
import { createTeamMemberSchema, updateTeamMemberSchema } from '@whatsapp-bot/shared';
import { requireAuth } from '../middleware/requireAuth';
import { requireRole } from '../middleware/requireRole';
import * as teamService from '../services/team/team.service';

const router = Router();

// All team routes require authentication
router.use(requireAuth);

// ── GET /team ────────────────────────────────────────────────────────────
router.get('/team', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await teamService.listTeamMembers(req.auth!.tenantId);
    res.json({ success: true, data: result.members, meta: result.quota });
  } catch (err) {
    next(err);
  }
});

// ── POST /team ───────────────────────────────────────────────────────────
router.post(
  '/team',
  requireRole('owner', 'admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = createTeamMemberSchema.parse(req.body);
      const member = await teamService.createTeamMember(req.auth!.tenantId, input);
      res.status(201).json({ success: true, data: member });
    } catch (err) {
      next(err);
    }
  }
);

// ── PUT /team/:userId ────────────────────────────────────────────────────
router.put(
  '/team/:userId',
  requireRole('owner', 'admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = updateTeamMemberSchema.parse(req.body);
      const member = await teamService.updateTeamMember(
        req.auth!.tenantId,
        req.params.userId,
        input
      );
      res.json({ success: true, data: member });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
