import { prisma } from '../../lib/prisma';
import { getOrSet, invalidateCache, cacheKeys } from '../cache/cache.service';
import type { UpdatePoliciesInput } from '@whatsapp-bot/shared';

export async function getPolicies(tenantId: string) {
  return getOrSet(
    cacheKeys.policies(tenantId),
    async () => {
      const policies = await prisma.tenantPolicies.findUnique({ where: { tenantId } });
      if (!policies) {
        // Auto-create if not exists
        return prisma.tenantPolicies.create({ data: { tenantId } });
      }
      return policies;
    },
    60 // 60 second TTL
  );
}

export async function updatePolicies(tenantId: string, input: UpdatePoliciesInput) {
  const result = await prisma.tenantPolicies.upsert({
    where: { tenantId },
    update: {
      returnPolicy: input.returnPolicy,
      shippingPolicy: input.shippingPolicy,
      faqContent: input.faqContent,
      businessHours: (input.businessHours as object) || undefined,
      timezone: input.timezone,
      autoReplyDelay: input.autoReplyDelay,
      // Language & tone fields
      ...(input.defaultLanguage !== undefined ? { defaultLanguage: input.defaultLanguage } : {}),
      ...(input.tone !== undefined ? { tone: input.tone } : {}),
      ...(input.autoDetectLanguage !== undefined ? { autoDetectLanguage: input.autoDetectLanguage } : {}),
    },
    create: {
      tenantId,
      returnPolicy: input.returnPolicy,
      shippingPolicy: input.shippingPolicy,
      faqContent: input.faqContent,
      businessHours: (input.businessHours as object) || undefined,
      timezone: input.timezone,
      autoReplyDelay: input.autoReplyDelay,
      defaultLanguage: input.defaultLanguage || 'EN',
      tone: input.tone || 'FRIENDLY',
      autoDetectLanguage: input.autoDetectLanguage ?? false,
    },
  });

  // Invalidate cache on update
  await invalidateCache(cacheKeys.policies(tenantId));
  return result;
}
