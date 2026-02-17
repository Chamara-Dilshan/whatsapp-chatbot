/**
 * Stripe billing service.
 *
 * Handles:
 * - Checkout session creation (plan upgrade)
 * - Customer portal session creation (manage subscription)
 * - Stripe webhook event processing (sync subscription state to DB)
 */

import Stripe from 'stripe';
import { prisma } from '../../lib/prisma';
import { env } from '../../config/env';
import { logger } from '../../lib/logger';

// Lazy-initialised Stripe client (only used when STRIPE_SECRET_KEY is set)
let _stripe: Stripe | null = null;

function getStripe(): Stripe {
  if (!_stripe) {
    if (!env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }
    _stripe = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: '2026-01-28.clover' });
  }
  return _stripe;
}

const PLAN_PRICE_MAP: Record<string, string | undefined> = {
  pro: env.STRIPE_PRICE_ID_PRO,
  business: env.STRIPE_PRICE_ID_BUSINESS,
};

// ── Checkout ───────────────────────────────────────────────────────────────

/**
 * Creates a Stripe Checkout session for upgrading to a paid plan.
 * Reuses the existing Stripe customer if one already exists for this tenant.
 */
export async function createCheckoutSession(
  tenantId: string,
  plan: 'pro' | 'business'
): Promise<string> {
  const stripe = getStripe();
  const priceId = PLAN_PRICE_MAP[plan];

  if (!priceId) {
    throw new Error(`Stripe price ID not configured for plan: ${plan}`);
  }

  const tenant = await prisma.tenant.findUniqueOrThrow({
    where: { id: tenantId },
    include: { subscription: true },
  });

  // Reuse existing Stripe customer or create a new one
  let stripeCustomerId = tenant.subscription?.stripeCustomerId ?? undefined;

  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      name: tenant.name,
      metadata: { tenantId },
    });
    stripeCustomerId = customer.id;
  }

  const session = await stripe.checkout.sessions.create({
    customer: stripeCustomerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${env.DASHBOARD_URL}/dashboard/billing?success=1`,
    cancel_url: `${env.DASHBOARD_URL}/dashboard/billing?canceled=1`,
    metadata: { tenantId, plan },
    subscription_data: {
      metadata: { tenantId, plan },
    },
  });

  if (!session.url) {
    throw new Error('Stripe checkout session URL is null');
  }

  return session.url;
}

// ── Customer Portal ────────────────────────────────────────────────────────

/**
 * Creates a Stripe Customer Portal session so the tenant can manage
 * their subscription (cancel, update payment method, etc.).
 */
export async function createPortalSession(tenantId: string): Promise<string> {
  const stripe = getStripe();

  const sub = await prisma.tenantSubscription.findUnique({
    where: { tenantId },
    select: { stripeCustomerId: true },
  });

  if (!sub?.stripeCustomerId) {
    throw new Error('No Stripe customer found for this tenant');
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: sub.stripeCustomerId,
    return_url: `${env.DASHBOARD_URL}/dashboard/billing`,
  });

  return session.url;
}

// ── Webhook Handler ────────────────────────────────────────────────────────

/**
 * Processes a verified Stripe webhook event and syncs subscription state to DB.
 */
export async function handleStripeWebhook(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      await handleCheckoutCompleted(session);
      break;
    }
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      await syncSubscription(subscription);
      break;
    }
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      await handleSubscriptionDeleted(subscription);
      break;
    }
    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      await handlePaymentFailed(invoice);
      break;
    }
    default:
      logger.debug({ eventType: event.type }, 'Unhandled Stripe webhook event');
  }
}

// ── Private helpers ────────────────────────────────────────────────────────

async function handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const tenantId = session.metadata?.tenantId;
  const plan = session.metadata?.plan;

  if (!tenantId || !plan) {
    logger.warn({ sessionId: session.id }, 'Checkout session missing tenantId or plan metadata');
    return;
  }

  // The subscription webhook will follow — this ensures stripeCustomerId is stored early
  await prisma.tenantSubscription.upsert({
    where: { tenantId },
    create: {
      tenantId,
      plan,
      stripeCustomerId: session.customer as string,
      stripeSubscriptionId: session.subscription as string,
      status: 'active',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
    update: {
      plan,
      stripeCustomerId: session.customer as string,
      stripeSubscriptionId: session.subscription as string,
      status: 'active',
    },
  });

  logger.info({ tenantId, plan }, 'Checkout completed — subscription activated');
}

async function syncSubscription(subscription: Stripe.Subscription): Promise<void> {
  const tenantId = subscription.metadata?.tenantId;
  if (!tenantId) {
    logger.warn({ subscriptionId: subscription.id }, 'Subscription missing tenantId metadata');
    return;
  }

  const plan = subscription.metadata?.plan ?? 'pro';
  const status = subscription.status; // active | past_due | canceled | trialing | ...

  await prisma.tenantSubscription.upsert({
    where: { tenantId },
    create: {
      tenantId,
      plan,
      stripeCustomerId: subscription.customer as string,
      stripeSubscriptionId: subscription.id,
      status,
      currentPeriodStart: new Date((subscription as unknown as Record<string, number>).current_period_start * 1000),
      currentPeriodEnd: new Date((subscription as unknown as Record<string, number>).current_period_end * 1000),
      cancelAtPeriodEnd: (subscription as unknown as Record<string, boolean>).cancel_at_period_end ?? false,
    },
    update: {
      plan,
      status,
      currentPeriodStart: new Date((subscription as unknown as Record<string, number>).current_period_start * 1000),
      currentPeriodEnd: new Date((subscription as unknown as Record<string, number>).current_period_end * 1000),
      cancelAtPeriodEnd: (subscription as unknown as Record<string, boolean>).cancel_at_period_end ?? false,
      canceledAt: (subscription as unknown as Record<string, number | null>).canceled_at
        ? new Date(((subscription as unknown as Record<string, number>).canceled_at) * 1000)
        : null,
    },
  });

  logger.info({ tenantId, plan, status }, 'Subscription synced');
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
  const tenantId = subscription.metadata?.tenantId;
  if (!tenantId) return;

  await prisma.tenantSubscription.upsert({
    where: { tenantId },
    create: {
      tenantId,
      plan: 'free',
      stripeCustomerId: subscription.customer as string,
      stripeSubscriptionId: subscription.id,
      status: 'canceled',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(),
      canceledAt: new Date(),
    },
    update: {
      plan: 'free',
      status: 'canceled',
      canceledAt: new Date(),
    },
  });

  logger.info({ tenantId }, 'Subscription canceled — downgraded to free');
}

async function handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  const customerId = invoice.customer as string;

  const sub = await prisma.tenantSubscription.findFirst({
    where: { stripeCustomerId: customerId },
    select: { tenantId: true },
  });

  if (!sub) return;

  await prisma.tenantSubscription.update({
    where: { tenantId: sub.tenantId },
    data: { status: 'past_due' },
  });

  logger.warn({ tenantId: sub.tenantId, invoiceId: invoice.id }, 'Payment failed — subscription past_due');
}
