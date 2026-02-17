/**
 * Stripe webhook signature verification middleware.
 *
 * Must be applied BEFORE any body parser on the /billing/stripe-webhook route.
 * Uses req.rawBody (captured by app.ts) to verify the Stripe-Signature header.
 */

import type { Request, Response, NextFunction } from 'express';
import Stripe from 'stripe';
import { env } from '../config/env';
import { logger } from '../lib/logger';

export function stripeWebhookVerify(req: Request, res: Response, next: NextFunction): void {
  const sig = req.headers['stripe-signature'] as string | undefined;

  if (!sig) {
    logger.warn('Stripe webhook received without Stripe-Signature header');
    res.status(400).json({ error: 'Missing Stripe-Signature header' });
    return;
  }

  if (!env.STRIPE_WEBHOOK_SECRET) {
    logger.error('STRIPE_WEBHOOK_SECRET is not configured');
    res.status(500).json({ error: 'Webhook secret not configured' });
    return;
  }

  const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;
  if (!rawBody) {
    logger.error('rawBody not available — ensure app.ts captures raw body before body-parser');
    res.status(400).json({ error: 'Raw body unavailable' });
    return;
  }

  let event: Stripe.Event;
  try {
    const stripe = new Stripe(env.STRIPE_SECRET_KEY!, { apiVersion: '2026-01-28.clover' });
    event = stripe.webhooks.constructEvent(rawBody, sig, env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.warn({ message }, 'Stripe webhook signature verification failed');
    res.status(400).json({ error: `Webhook signature invalid: ${message}` });
    return;
  }

  // Attach the verified event to the request for the route handler
  (req as Request & { stripeEvent?: Stripe.Event }).stripeEvent = event;
  next();
}
