/**
 * BullMQ webhook processing queue.
 *
 * The webhook route enqueues jobs here and returns 200 immediately.
 * The worker processes jobs asynchronously in the same process.
 *
 * NOTE: We pass a plain Redis connection config object to BullMQ to avoid
 * ioredis version mismatches in the monorepo pnpm dedupe graph.
 */

import { Queue } from 'bullmq';
import { env } from '../../config/env';
import { logger } from '../../lib/logger';
import type { WebhookPayload } from '../whatsapp/types';

export interface WebhookJobData {
  payload: WebhookPayload;
  requestId: string;
}

function getBullMQConnection() {
  const url = new URL(env.REDIS_URL);
  return {
    host: url.hostname,
    port: parseInt(url.port || '6379', 10),
    password: url.password || undefined,
    db: url.pathname ? parseInt(url.pathname.slice(1) || '0', 10) : 0,
    maxRetriesPerRequest: null as unknown as number,
    enableReadyCheck: false,
  };
}

let _webhookQueue: Queue | null = null;

export function getWebhookQueue(): Queue {
  if (!_webhookQueue) {
    _webhookQueue = new Queue('webhook-processing', {
      connection: getBullMQConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 200 },
      },
    });

    _webhookQueue.on('error', (err) => {
      logger.error({ err }, 'Webhook queue error');
    });
  }
  return _webhookQueue;
}

/**
 * Enqueue a webhook payload for async processing.
 */
export async function enqueueWebhook(data: WebhookJobData): Promise<void> {
  const queue = getWebhookQueue();
  await queue.add('process-webhook', data, {
    jobId: data.requestId, // Use requestId for deduplication
  });
  logger.debug({ requestId: data.requestId }, 'Webhook job enqueued');
}
