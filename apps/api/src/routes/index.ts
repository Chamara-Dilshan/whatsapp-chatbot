import { Router } from 'express';
import healthRoutes from './health.routes';
import webhookRoutes from './webhook.routes';
import authRoutes from './auth.routes';
import tenantRoutes from './tenant.routes';

const router = Router();

router.use(healthRoutes);
router.use(webhookRoutes);
router.use(authRoutes);
router.use(tenantRoutes);

// Phase 3: product routes
// Phase 4: inbox, case, automation, analytics routes

export default router;
