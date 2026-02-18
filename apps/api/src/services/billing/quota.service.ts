/**
 * Quota enforcement service.
 *
 * Resolves the effective plan limits for a tenant, taking into account:
 * 1. TenantSubscription.plan (billing plan)
 * 2. TenantQuotaOverride (per-tenant admin overrides)
 *
 * Used by:
 * - webhook.service.ts  → checkInboundQuota
 * - tenant.routes.ts    → checkAgentLimit (before adding a new user)
 * - automation.service.ts → checkAutomationEnabled
 */

import { prisma } from '../../lib/prisma';
import { getPlanLimits } from '../../config/plans';
import { getMonthlyUsage } from './usage.service';

// ── Subscription helpers ───────────────────────────────────────────────────

/**
 * Returns the effective plan name for a tenant.
 * Falls back to the legacy `Tenant.plan` field, then to "free".
 */
export async function getTenantPlan(tenantId: string): Promise<string> {
  const sub = await prisma.tenantSubscription.findUnique({
    where: { tenantId },
    select: { plan: true, status: true },
  });

  if (sub && sub.status !== 'canceled') {
    return sub.plan;
  }

  // Legacy fallback — Tenant.plan field
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { plan: true },
  });

  return tenant?.plan ?? 'free';
}

/**
 * Returns effective numeric limits for a tenant, merging plan defaults
 * with any per-tenant quota overrides set by an admin.
 */
export async function getEffectiveLimits(tenantId: string) {
  const [plan, override] = await Promise.all([
    getTenantPlan(tenantId),
    prisma.tenantQuotaOverride.findUnique({ where: { tenantId } }),
  ]);

  const base = getPlanLimits(plan);

  return {
    plan,
    maxAgents: override?.maxAgents ?? base.maxAgents,
    maxInboundPerMonth: override?.maxInboundPerMonth ?? base.maxInboundPerMonth,
    maxOutboundPerDay: override?.maxOutboundPerDay ?? base.maxOutboundPerDay,
    maxProducts: override?.maxProducts ?? base.maxProducts,
    automationEnabled: base.automationEnabled,
    analyticsEnabled: base.analyticsEnabled,
    aiEnabled: base.aiEnabled,
    maxAiCallsPerMonth: override?.maxAiCallsPerMonth ?? base.maxAiCallsPerMonth,
  };
}

// ── Quota checks ──────────────────────────────────────────────────────────

/**
 * Checks whether the tenant can receive another inbound message this month.
 */
export async function checkInboundQuota(
  tenantId: string
): Promise<{ allowed: boolean; used: number; limit: number; remaining: number }> {
  const [limits, usage] = await Promise.all([
    getEffectiveLimits(tenantId),
    getMonthlyUsage(tenantId),
  ]);

  const used = usage?.inboundMessagesCount ?? 0;
  const limit = limits.maxInboundPerMonth;
  const remaining = Math.max(0, limit - used);

  return {
    allowed: used < limit,
    used,
    limit,
    remaining,
  };
}

/**
 * Checks whether the tenant can add another agent (TenantUser) this month.
 */
export async function checkAgentLimit(
  tenantId: string
): Promise<{ allowed: boolean; current: number; limit: number }> {
  const [limits, current] = await Promise.all([
    getEffectiveLimits(tenantId),
    prisma.tenantUser.count({ where: { tenantId } }),
  ]);

  return {
    allowed: current < limits.maxAgents,
    current,
    limit: limits.maxAgents,
  };
}

/**
 * Checks whether automation features are enabled for the tenant's plan.
 */
export async function checkAutomationEnabled(tenantId: string): Promise<boolean> {
  const limits = await getEffectiveLimits(tenantId);
  return limits.automationEnabled;
}

/**
 * Checks whether analytics features are enabled for the tenant's plan.
 */
export async function checkAnalyticsEnabled(tenantId: string): Promise<boolean> {
  const limits = await getEffectiveLimits(tenantId);
  return limits.analyticsEnabled;
}

/**
 * Checks whether the tenant can make another AI call this month.
 */
export async function checkAiQuota(
  tenantId: string
): Promise<{ allowed: boolean; used: number; limit: number; remaining: number }> {
  const [limits, usage] = await Promise.all([
    getEffectiveLimits(tenantId),
    getMonthlyUsage(tenantId),
  ]);

  const used = usage?.aiCallsCount ?? 0;
  const limit = limits.maxAiCallsPerMonth;
  const remaining = Math.max(0, limit - used);

  return {
    allowed: used < limit,
    used,
    limit,
    remaining,
  };
}
