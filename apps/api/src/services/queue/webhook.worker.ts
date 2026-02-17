/**
 * BullMQ webhook worker.
 *
 * Runs in the same process as the API server.
 * Processes queued webhook jobs by calling the existing processWebhook() pipeline.
 *
 * Start by calling startWebhookWorker() from server.ts after Express starts.
 */

import { Worker } from 'bullmq';
import { env } from '../../config/env';
import { processWebhook } from '../whatsapp/webhook.service';
import { logger } from '../../lib/logger';
import type { WebhookJobData } from './webhook.queue';

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

let _worker: Worker | null = null;

export function startWebhookWorker(): void {
  if (_worker) return;

  _worker = new Worker(
    'webhook-processing',
    async (job) => {
      const { payload, requestId } = job.data as WebhookJobData;
      logger.debug({ requestId, jobId: job.id, attempt: job.attemptsMade + 1 }, 'Processing webhook job');
      await processWebhook(payload, requestId);
    },
    {
      connection: getBullMQConnection(),
      concurrency: 10, // Process up to 10 webhook jobs in parallel
    }
  );

  _worker.on('completed', (job) => {
    logger.debug({ jobId: job.id, requestId: (job.data as WebhookJobData).requestId }, 'Webhook job completed');
  });

  _worker.on('failed', (job, err) => {
    logger.error(
      { jobId: job?.id, requestId: (job?.data as WebhookJobData)?.requestId, err, attempt: job?.attemptsMade },
      'Webhook job failed'
    );
  });

  _worker.on('error', (err) => {
    logger.error({ err }, 'Webhook worker error');
  });

  logger.info('Webhook worker started (concurrency: 10)');
}

export async function stopWebhookWorker(): Promise<void> {
  if (_worker) {
    await _worker.close();
    _worker = null;
    logger.info('Webhook worker stopped');
  }
}
