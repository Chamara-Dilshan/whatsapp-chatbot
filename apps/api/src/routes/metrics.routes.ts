/**
 * GET /metrics — Prometheus metrics endpoint.
 *
 * IMPORTANT: This should be restricted to internal/monitoring networks in production.
 * The nginx config restricts access to 127.0.0.1 / internal IPs.
 * Do not expose this publicly.
 */

import { Router, Request, Response } from 'express';
import { register } from '../lib/metrics';

const router = Router();

router.get('/metrics', async (_req: Request, res: Response) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (err) {
    res.status(500).end(String(err));
  }
});

export default router;
