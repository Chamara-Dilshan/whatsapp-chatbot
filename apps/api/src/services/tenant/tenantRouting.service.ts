import { LRUCache } from 'lru-cache';
import { prisma } from '../../lib/prisma';
import { logger } from '../../lib/logger';

interface TenantRouteInfo {
  tenantId: string;
  phoneNumberId: string;
  accessTokenEnc: string;
  appSecretEnc: string;
  catalogId: string | null;
  webhookVerifyToken: string;
}

// Cache tenant routing info for 5 minutes
const routeCache = new LRUCache<string, TenantRouteInfo>({
  max: 500,
  ttl: 5 * 60 * 1000,
});

/**
 * Resolve a phone_number_id to tenant info.
 * Uses an LRU cache to avoid repeated DB lookups on high-volume webhooks.
 */
export async function resolveByPhoneNumberId(phoneNumberId: string): Promise<TenantRouteInfo | null> {
  const cached = routeCache.get(phoneNumberId);
  if (cached) return cached;

  const tenantWa = await prisma.tenantWhatsApp.findUnique({
    where: { phoneNumberId },
    select: {
      tenantId: true,
      phoneNumberId: true,
      accessTokenEnc: true,
      appSecretEnc: true,
      catalogId: true,
      webhookVerifyToken: true,
      isActive: true,
    },
  });

  if (!tenantWa || !tenantWa.isActive) {
    logger.warn({ phoneNumberId }, 'Tenant not found or inactive for phone_number_id');
    return null;
  }

  const info: TenantRouteInfo = {
    tenantId: tenantWa.tenantId,
    phoneNumberId: tenantWa.phoneNumberId,
    accessTokenEnc: tenantWa.accessTokenEnc,
    appSecretEnc: tenantWa.appSecretEnc,
    catalogId: tenantWa.catalogId,
    webhookVerifyToken: tenantWa.webhookVerifyToken,
  };

  routeCache.set(phoneNumberId, info);
  return info;
}

/**
 * Invalidate cache entry when tenant config changes.
 */
export function invalidateCache(phoneNumberId: string): void {
  routeCache.delete(phoneNumberId);
}
