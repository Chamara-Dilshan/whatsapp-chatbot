import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { env } from './config/env';
import { requestIdMiddleware } from './middleware/requestId';
import { errorHandler } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/notFound';
import { captureRawBody } from './middleware/rawBody';
import { apiLimiter } from './middleware/rateLimiter';
import routes from './routes';
import { logger } from './lib/logger';

export function createApp() {
  const app = express();

  // Security
  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
    })
  );

  // Request ID
  app.use(requestIdMiddleware);

  // Request logging
  app.use((req, _res, next) => {
    logger.info({ method: req.method, url: req.url, requestId: req.requestId }, 'Incoming request');
    next();
  });

  // Body parsing with raw body capture for webhook signature verification
  app.use(express.json({ limit: '10mb', verify: captureRawBody }));
  app.use(express.urlencoded({ extended: true }));

  // Compression
  app.use(compression());

  // General API rate limiting (skips /webhook/whatsapp to avoid blocking Meta)
  app.use((req, res, next) => {
    if (req.path.startsWith('/webhook/')) return next();
    return apiLimiter(req, res, next);
  });

  // Routes
  app.use(routes);

  // 404 handler
  app.use(notFoundHandler);

  // Error handler
  app.use(errorHandler);

  return app;
}
