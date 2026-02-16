import { prisma } from '../../lib/prisma';
import { NotFoundError } from '../../middleware/errorHandler';
import type { UpdatePoliciesInput } from '@whatsapp-bot/shared';

export async function getPolicies(tenantId: string) {
  const policies = await prisma.tenantPolicies.findUnique({
    where: { tenantId },
  });

  if (!policies) {
    // Auto-create if not exists
    return prisma.tenantPolicies.create({
      data: { tenantId },
    });
  }

  return policies;
}

export async function updatePolicies(tenantId: string, input: UpdatePoliciesInput) {
  return prisma.tenantPolicies.upsert({
    where: { tenantId },
    update: {
      returnPolicy: input.returnPolicy,
      shippingPolicy: input.shippingPolicy,
      faqContent: input.faqContent,
      businessHours: input.businessHours as object || undefined,
      timezone: input.timezone,
      autoReplyDelay: input.autoReplyDelay,
    },
    create: {
      tenantId,
      returnPolicy: input.returnPolicy,
      shippingPolicy: input.shippingPolicy,
      faqContent: input.faqContent,
      businessHours: input.businessHours as object || undefined,
      timezone: input.timezone,
      autoReplyDelay: input.autoReplyDelay,
    },
  });
}
