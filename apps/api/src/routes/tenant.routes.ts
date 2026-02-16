import { Router, Request, Response, NextFunction } from 'express';
import {
  connectWhatsAppSchema,
  updateCatalogSchema,
  updatePoliciesSchema,
  createTemplateSchema,
  updateTemplateSchema,
} from '@whatsapp-bot/shared';
import { requireAuth } from '../middleware/requireAuth';
import { requireRole } from '../middleware/requireRole';
import * as tenantWhatsAppService from '../services/tenant/tenantWhatsApp.service';
import * as policyService from '../services/policy/policy.service';
import * as templateService from '../services/template/template.service';

const router = Router();

// All tenant routes require authentication
router.use(requireAuth);

// ─── WhatsApp Connection ──────────────────────────────────────────

router.post(
  '/tenant/whatsapp/connect',
  requireRole('owner', 'admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = connectWhatsAppSchema.parse(req.body);
      const result = await tenantWhatsAppService.connectWhatsApp(req.auth!.tenantId, input);
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
);

router.get('/tenant/whatsapp/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await tenantWhatsAppService.getStatus(req.auth!.tenantId);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

router.put(
  '/tenant/whatsapp/catalog',
  requireRole('owner', 'admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = updateCatalogSchema.parse(req.body);
      const result = await tenantWhatsAppService.updateCatalog(req.auth!.tenantId, input.catalogId);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
);

// ─── Policies ─────────────────────────────────────────────────────

router.get('/tenant/policies', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await policyService.getPolicies(req.auth!.tenantId);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

router.put(
  '/tenant/policies',
  requireRole('owner', 'admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = updatePoliciesSchema.parse(req.body);
      const result = await policyService.updatePolicies(req.auth!.tenantId, input);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
);

// ─── Templates ────────────────────────────────────────────────────

router.get('/tenant/templates', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await templateService.listTemplates(req.auth!.tenantId);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

router.post(
  '/tenant/templates',
  requireRole('owner', 'admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = createTemplateSchema.parse(req.body);
      const result = await templateService.createTemplate(req.auth!.tenantId, input);
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
);

router.put(
  '/tenant/templates/:id',
  requireRole('owner', 'admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = updateTemplateSchema.parse(req.body);
      const result = await templateService.updateTemplate(req.auth!.tenantId, req.params.id, input);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
);

router.delete(
  '/tenant/templates/:id',
  requireRole('owner', 'admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await templateService.deleteTemplate(req.auth!.tenantId, req.params.id);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
