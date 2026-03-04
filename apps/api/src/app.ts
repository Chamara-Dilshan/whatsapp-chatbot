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
import { httpRequestsTotal } from './lib/metrics';

// Normalise Express path params and raw IDs from a URL path string
function normalisePath(path: string): string {
  return path
    .replace(/\/[0-9a-f]{20,}/gi, '/:id') // cuid / nanoid
    .replace(/\/[0-9a-f-]{36}/gi, '/:id') // UUID
    .replace(/\/\d+/g, '/:id'); // numeric IDs
}

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

  // HTTP metrics — attach before routes so res.on('finish') fires after routing
  app.use((req, res, next) => {
    res.on('finish', () => {
      const route = (req.route?.path as string | undefined) ?? normalisePath(req.path);
      httpRequestsTotal.inc({ method: req.method, route, status: String(res.statusCode) });
    });
    next();
  });

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
