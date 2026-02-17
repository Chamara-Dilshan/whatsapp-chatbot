/**
 * Plan definitions and limits.
 *
 * These values are enforced in:
 * - webhook.service.ts (inbound message quota)
 * - send.service.ts (outbound message quota)
 * - automation.service.ts (automation event quota + feature gate)
 * - tenant.routes.ts (agent count limit)
 * - product.routes.ts (product count limit — optional)
 */

export type PlanName = 'free' | 'pro' | 'business';

export interface PlanLimits {
  maxAgents: number;
  maxInboundPerMonth: number;
  maxOutboundPerDay: number;
  maxProducts: number | null; // null = unlimited
  automationEnabled: boolean;
  analyticsEnabled: boolean;
}

export const PLAN_LIMITS: Record<PlanName, PlanLimits> = {
  free: {
    maxAgents: 1,
    maxInboundPerMonth: 500,
    maxOutboundPerDay: 100,
    maxProducts: 50,
    automationEnabled: false,
    analyticsEnabled: false,
  },
  pro: {
    maxAgents: 3,
    maxInboundPerMonth: 5000,
    maxOutboundPerDay: 1000,
    maxProducts: 500,
    automationEnabled: true,
    analyticsEnabled: true,
  },
  business: {
    maxAgents: 10,
    maxInboundPerMonth: 50000,
    maxOutboundPerDay: 10000,
    maxProducts: null,
    automationEnabled: true,
    analyticsEnabled: true,
  },
};

export function getPlanLimits(plan: string): PlanLimits {
  return PLAN_LIMITS[plan as PlanName] ?? PLAN_LIMITS.free;
}
