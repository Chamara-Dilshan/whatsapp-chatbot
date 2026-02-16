import { prisma } from '../../lib/prisma';
import { logger } from '../../lib/logger';

/**
 * Upsert a customer by tenantId + waId.
 * Updates name if provided.
 */
export async function upsertCustomer(params: {
  tenantId: string;
  waId: string;
  name?: string;
}) {
  const { tenantId, waId, name } = params;

  const customer = await prisma.customer.upsert({
    where: { tenantId_waId: { tenantId, waId } },
    update: {
      ...(name ? { name } : {}),
      updatedAt: new Date(),
    },
    create: {
      tenantId,
      waId,
      name: name || null,
      phone: waId,
    },
  });

  return customer;
}

/**
 * Set customer as opted out.
 */
export async function setOptedOut(customerId: string, optedOut: boolean) {
  return prisma.customer.update({
    where: { id: customerId },
    data: {
      optedOut,
      optOutAt: optedOut ? new Date() : null,
    },
  });
}

/**
 * Check if customer is opted out.
 */
export async function isOptedOut(tenantId: string, waId: string): Promise<boolean> {
  const customer = await prisma.customer.findUnique({
    where: { tenantId_waId: { tenantId, waId } },
    select: { optedOut: true },
  });
  return customer?.optedOut ?? false;
}
