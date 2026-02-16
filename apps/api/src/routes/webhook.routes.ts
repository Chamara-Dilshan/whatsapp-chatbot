import { Router, Request, Response, NextFunction } from 'express';
import { env } from '../config/env';
import { processWebhook } from '../services/whatsapp/webhook.service';
import { verifyMetaSignature } from '../middleware/signatureVerify';
import { logger } from '../lib/logger';

const router = Router();

/**
 * GET /webhook/whatsapp - Webhook verification endpoint.
 * WhatsApp sends this to verify the webhook URL during setup.
 */
router.get('/webhook/whatsapp', (req: Request, res: Response) => {
  const mode = req.query['hub.mode'] as string;
  const token = req.query['hub.verify_token'] as string;
  const challenge = req.query['hub.challenge'] as string;

  if (mode === 'subscribe' && token === env.WEBHOOK_VERIFY_TOKEN) {
    logger.info('Webhook verification successful');
    res.status(200).send(challenge);
    return;
  }

  logger.warn({ mode, token }, 'Webhook verification failed');
  res.status(403).send('Verification failed');
});

/**
 * POST /webhook/whatsapp - Receive inbound messages from WhatsApp.
 * Always returns 200 to prevent WhatsApp from retrying.
 */
router.post('/webhook/whatsapp', verifyMetaSignature, async (req: Request, res: Response) => {
  // Return 200 immediately to WhatsApp
  res.status(200).json({ status: 'received' });

  // Process asynchronously (after response is sent)
  try {
    await processWebhook(req.body, req.requestId);
  } catch (err) {
    logger.error({ err, requestId: req.requestId }, 'Webhook processing failed');
  }
});

export default router;
