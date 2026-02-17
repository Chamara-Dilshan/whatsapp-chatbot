import { Router } from 'express';
import healthRoutes from './health.routes';
import webhookRoutes from './webhook.routes';
import authRoutes from './auth.routes';
import tenantRoutes from './tenant.routes';
import productRoutes from './product.routes';
import inboxRoutes from './inbox.routes';
import caseRoutes from './case.routes';
import automationRoutes from './automation.routes';
import analyticsRoutes from './analytics.routes';

const router = Router();

router.use(healthRoutes);
router.use(webhookRoutes);
router.use(authRoutes);
router.use(tenantRoutes);
router.use(productRoutes);

// Phase 4: inbox, case, automation, analytics routes
router.use(inboxRoutes);
router.use(caseRoutes);
router.use(automationRoutes);
router.use(analyticsRoutes);

export default router;
