import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

router.get('/health', async (_req: Request, res: Response) => {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('DB timeout')), 3000)
  );
  try {
    await Promise.race([prisma.$queryRaw`SELECT 1`, timeout]);
    res.json({
      success: true,
      data: {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      },
    });
  } catch {
    res.status(503).json({
      success: false,
      data: {
        status: 'degraded',
        timestamp: new Date().toISOString(),
        database: 'unreachable',
      },
    });
  }
});

export default router;
