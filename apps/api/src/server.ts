import { createApp } from './app';
import { env } from './config/env';
import { logger } from './lib/logger';
import { prisma } from './lib/prisma';
import { dispatcher } from './services/automation/dispatcher';
import { startWebhookWorker, stopWebhookWorker } from './services/queue/webhook.worker';

const app = createApp();

const server = app.listen(env.API_PORT, () => {
  logger.info(`API server running on http://localhost:${env.API_PORT}`);
  logger.info(`Environment: ${env.NODE_ENV}`);

  // Start automation dispatcher (polls every 30 seconds)
  dispatcher.start(30);

  // Start BullMQ webhook worker (runs in-process)
  startWebhookWorker();
});

// Graceful shutdown
const shutdown = async (signal: string) => {
  logger.info(`${signal} received. Shutting down gracefully...`);

  // Stop workers
  dispatcher.stop();
  await stopWebhookWorker();

  server.close(async () => {
    await prisma.$disconnect();
    logger.info('Server closed');
    process.exit(0);
  });

  // Force close after 10 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'Unhandled Rejection');
});

process.on('uncaughtException', (error) => {
  logger.error({ error }, 'Uncaught Exception');
  process.exit(1);
});
