import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth';
import * as analyticsService from '../services/analytics/analytics.service';
import { logger } from '../lib/logger';

const router = Router();

/**
 * Parse date range from query parameters.
 */
function parseDateRange(req: any) {
  const { startDate, endDate } = req.query;

  if (startDate && endDate) {
    return {
      startDate: new Date(startDate as string),
      endDate: new Date(endDate as string),
    };
  }

  return undefined;
}

/**
 * GET /analytics/overview
 * Get overview analytics.
 */
router.get('/analytics/overview', requireAuth, async (req, res, next) => {
  try {
    const tenantId = req.auth!.tenantId;
    const dateRange = parseDateRange(req);

    const analytics = await analyticsService.getOverviewAnalytics(tenantId, dateRange);

    res.json(analytics);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /analytics/intents
 * Get intent distribution analytics.
 */
router.get('/analytics/intents', requireAuth, async (req, res, next) => {
  try {
    const tenantId = req.auth!.tenantId;
    const dateRange = parseDateRange(req);

    const intents = await analyticsService.getIntentAnalytics(tenantId, dateRange);

    res.json(intents);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /analytics/agents
 * Get agent performance analytics.
 */
router.get('/analytics/agents', requireAuth, async (req, res, next) => {
  try {
    const tenantId = req.auth!.tenantId;
    const dateRange = parseDateRange(req);

    const agents = await analyticsService.getAgentAnalytics(tenantId, dateRange);

    res.json(agents);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /analytics/sla
 * Get SLA performance metrics.
 */
router.get('/analytics/sla', requireAuth, async (req, res, next) => {
  try {
    const tenantId = req.auth!.tenantId;
    const dateRange = parseDateRange(req);

    const slaMetrics = await analyticsService.getSLAMetrics(tenantId, dateRange);

    res.json(slaMetrics);
  } catch (error) {
    next(error);
  }
});

export default router;
