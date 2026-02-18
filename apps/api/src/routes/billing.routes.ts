/**
 * Billing routes.
 *
 * POST /billing/create-checkout-session  — Start Stripe checkout (owner only)
 * POST /billing/create-portal-session    — Open Stripe customer portal (owner only)
 * GET  /billing/subscription             — Current subscription info
 * GET  /billing/usage                    — Current + historical usage
 * POST /billing/stripe-webhook           — Stripe webhook receiver (no auth, sig-verified)
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/requireAuth';
import { requireRole } from '../middleware/requireRole';
import { stripeWebhookVerify } from '../middleware/stripeWebhookVerify';
import {
  createCheckoutSession,
  createPortalSession,
  handleStripeWebhook,
} from '../services/billing/billing.service';
import { getMonthlyUsage, getUsageHistory } from '../services/billing/usage.service';
import { getEffectiveLimits } from '../services/billing/quota.service';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import type Stripe from 'stripe';

const router = Router();

// ── POST /billing/create-checkout-session ─────────────────────────────────
const checkoutSchema = z.object({
  plan: z.enum(['pro', 'business']),
});

router.post(
  '/billing/create-checkout-session',
  requireAuth,
  requireRole('owner'),
  async (req: Request, res: Response) => {
    try {
      const { plan } = checkoutSchema.parse(req.body);
      const { tenantId } = req.auth!;
      const url = await createCheckoutSession(tenantId, plan);
      res.json({ url });
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ error: 'Invalid request', details: err.errors });
        return;
      }
      const message = err instanceof Error ? err.message : 'Unknown error';
      logger.error({ err }, 'create-checkout-session failed');
      res.status(500).json({ error: message });
    }
  }
);

// ── POST /billing/create-portal-session ───────────────────────────────────
router.post(
  '/billing/create-portal-session',
  requireAuth,
  requireRole('owner'),
  async (req: Request, res: Response) => {
    try {
      const { tenantId } = req.auth!;
      const url = await createPortalSession(tenantId);
      res.json({ url });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      logger.error({ err }, 'create-portal-session failed');
      res.status(500).json({ error: message });
    }
  }
);

// ── GET /billing/subscription ─────────────────────────────────────────────
router.get('/billing/subscription', requireAuth, async (req: Request, res: Response) => {
  const { tenantId } = req.auth!;

  const [subscription, limits] = await Promise.all([
    prisma.tenantSubscription.findUnique({ where: { tenantId } }),
    getEffectiveLimits(tenantId),
  ]);

  res.json({
    subscription: subscription ?? {
      plan: limits.plan,
      status: 'active',
      currentPeriodStart: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
    },
    limits,
  });
});

// ── GET /billing/usage ────────────────────────────────────────────────────
router.get('/billing/usage', requireAuth, async (req: Request, res: Response) => {
  const { tenantId } = req.auth!;

  const [current, history, limits] = await Promise.all([
    getMonthlyUsage(tenantId),
    getUsageHistory(tenantId, 3),
    getEffectiveLimits(tenantId),
  ]);

  res.json({
    current: current ?? {
      inboundMessagesCount: 0,
      outboundMessagesCount: 0,
      automationEventsCount: 0,
      aiCallsCount: 0,
    },
    history,
    limits,
  });
});

// ── POST /billing/stripe-webhook ──────────────────────────────────────────
// NOTE: stripeWebhookVerify uses req.rawBody — no JSON body-parser here
router.post(
  '/billing/stripe-webhook',
  stripeWebhookVerify,
  async (req: Request, res: Response) => {
    const event = (req as Request & { stripeEvent?: Stripe.Event }).stripeEvent;
    if (!event) {
      res.status(400).json({ error: 'No verified event found' });
      return;
    }

    try {
      await handleStripeWebhook(event);
      res.json({ received: true });
    } catch (err) {
      logger.error({ err, eventType: event.type }, 'Stripe webhook handler error');
      // Return 200 to prevent Stripe from retrying events that fail due to our own bugs
      res.json({ received: true, warning: 'Handler error — check server logs' });
    }
  }
);

export default router;
