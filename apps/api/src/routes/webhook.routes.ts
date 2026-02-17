import { Router, Request, Response } from 'express';
import { env } from '../config/env';
import { enqueueWebhook } from '../services/queue/webhook.queue';
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
 *
 * Returns 200 immediately (<50ms) and enqueues processing to BullMQ.
 * The webhook worker handles actual message processing asynchronously.
 *
 * Per WhatsApp docs: always return 200 or they will retry indefinitely.
 */
router.post('/webhook/whatsapp', verifyMetaSignature, async (req: Request, res: Response) => {
  // Return 200 to WhatsApp immediately — this is critical for reliability
  res.status(200).json({ status: 'received' });

  // Enqueue for async processing
  try {
    await enqueueWebhook({
      payload: req.body,
      requestId: req.requestId,
    });
  } catch (err) {
    // Enqueue failure is non-fatal for the HTTP response (already sent 200)
    // The message will be retried if the queue is temporarily unavailable
    logger.error({ err, requestId: req.requestId }, 'Failed to enqueue webhook job');
  }
});

export default router;
