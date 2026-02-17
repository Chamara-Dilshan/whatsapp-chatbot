import rateLimit from 'express-rate-limit';
import type { Request, Response } from 'express';

/**
 * Rate limiter for authentication endpoints.
 * 5 requests per 15 minutes per IP — protects against brute-force attacks.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) =>
    (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
    req.socket.remoteAddress ||
    'unknown',
  handler: (_req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many login attempts. Please try again in 15 minutes.',
      },
    });
  },
});

/**
 * General API rate limiter.
 * 100 requests per minute per tenant (or IP for unauthenticated requests).
 */
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    // Use tenantId from JWT if available, otherwise IP
    return (req as any).auth?.tenantId ||
      (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
      req.socket.remoteAddress ||
      'unknown';
  },
  handler: (_req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many requests. Please slow down.',
      },
    });
  },
});
