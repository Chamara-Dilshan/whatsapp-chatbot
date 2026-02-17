import { Router } from 'express';
import { requireAutomationKey } from '../middleware/requireAutomationKey';
import * as automationService from '../services/automation/automation.service';
import { logger } from '../lib/logger';

const router = Router();

/**
 * POST /automation/events/:eventId/delivered
 * Mark an event as delivered (acknowledged by n8n).
 */
router.post(
  '/automation/events/:eventId/delivered',
  requireAutomationKey,
  async (req, res, next) => {
    try {
      const { eventId } = req.params;

      const event = await automationService.markEventDelivered(eventId);

      res.json({ success: true, event });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /automation/events/:eventId/failed
 * Mark an event as failed (from n8n).
 */
router.post(
  '/automation/events/:eventId/failed',
  requireAutomationKey,
  async (req, res, next) => {
    try {
      const { eventId } = req.params;
      const { error } = req.body;

      const event = await automationService.markEventFailed(
        eventId,
        error || 'Failed in n8n workflow'
      );

      res.json({ success: true, event });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /automation/events/:eventId
 * Get event details (for n8n to fetch event data).
 */
router.get('/automation/events/:eventId', requireAutomationKey, async (req, res, next) => {
  try {
    const { eventId } = req.params;

    const event = await automationService.getEventById(eventId);

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.json(event);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /automation/webhook/n8n
 * Generic webhook endpoint for n8n to post results/actions back to the API.
 * This can be used for notifications, updates, or custom actions.
 */
router.post('/automation/webhook/n8n', requireAutomationKey, async (req, res, next) => {
  try {
    const { action, payload } = req.body;

    logger.info({ action, payload }, 'Received n8n webhook');

    // Handle different actions from n8n
    switch (action) {
      case 'notification_sent':
        logger.info({ payload }, 'n8n notification sent');
        break;

      case 'slack_alert':
        logger.info({ payload }, 'n8n Slack alert sent');
        break;

      case 'email_sent':
        logger.info({ payload }, 'n8n email sent');
        break;

      default:
        logger.warn({ action }, 'Unknown n8n action');
    }

    res.json({ success: true, message: 'Webhook received' });
  } catch (error) {
    next(error);
  }
});

export default router;
