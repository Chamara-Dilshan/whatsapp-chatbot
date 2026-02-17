import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';
import { logger } from '../lib/logger';

/**
 * Middleware to verify automation API key from n8n webhooks.
 */
export function requireAutomationKey(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.headers['x-automation-api-key'] as string;

  if (!env.AUTOMATION_API_KEY) {
    logger.warn('AUTOMATION_API_KEY not configured, allowing all automation requests');
    return next();
  }

  if (!apiKey || apiKey !== env.AUTOMATION_API_KEY) {
    logger.warn({ apiKey, ip: req.ip }, 'Invalid automation API key');
    return res.status(401).json({ error: 'Unauthorized: Invalid API key' });
  }

  next();
}
