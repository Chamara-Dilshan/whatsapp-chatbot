/**
 * Usage tracking service.
 *
 * Tracks per-tenant monthly usage counters for:
 * - Inbound messages received
 * - Outbound messages sent
 * - Automation events dispatched
 * - AI fallback calls made
 *
 * Uses atomic Prisma upsert+increment to prevent race conditions.
 */

import { prisma } from '../../lib/prisma';

export type UsageField =
  | 'inboundMessagesCount'
  | 'outboundMessagesCount'
  | 'automationEventsCount'
  | 'aiCallsCount';

/**
 * Returns the current billing period key in "YYYY-MM" format.
 * Example: "2026-02"
 */
export function getCurrentPeriodKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Atomically increment a usage counter for the current month.
 * Creates the counter record if it doesn't exist yet.
 */
export async function incrementUsage(
  tenantId: string,
  field: UsageField,
  amount = 1
): Promise<void> {
  const period = getCurrentPeriodKey();

  await prisma.usageCounter.upsert({
    where: { tenantId_period: { tenantId, period } },
    create: {
      tenantId,
      period,
      [field]: amount,
    },
    update: {
      [field]: { increment: amount },
    },
  });
}

/**
 * Get current month's usage for a tenant.
 * Returns null if no usage recorded yet.
 */
export async function getMonthlyUsage(tenantId: string) {
  const period = getCurrentPeriodKey();
  return prisma.usageCounter.findUnique({
    where: { tenantId_period: { tenantId, period } },
  });
}

/**
 * Get usage history for a tenant (last N months).
 */
export async function getUsageHistory(tenantId: string, months = 3) {
  return prisma.usageCounter.findMany({
    where: { tenantId },
    orderBy: { period: 'desc' },
    take: months,
  });
}
