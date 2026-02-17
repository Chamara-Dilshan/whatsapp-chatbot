/**
 * Simple Redis-backed cache service for per-tenant data.
 *
 * Caches:
 * - Tenant policies (60s TTL)
 * - Tenant reply templates (60s TTL)
 * - Product categories per tenant (120s TTL)
 *
 * Falls back gracefully when Redis is unavailable.
 */

import { getRedis } from '../../lib/redis';
import { logger } from '../../lib/logger';

export const cacheKeys = {
  policies: (tenantId: string) => `policies:${tenantId}`,
  templates: (tenantId: string) => `templates:${tenantId}`,
  productCategories: (tenantId: string) => `prod-cats:${tenantId}`,
};

/**
 * Get a cached value. Returns null on miss or Redis error.
 */
export async function getCached<T>(key: string): Promise<T | null> {
  try {
    const redis = getRedis();
    const value = await redis.get(key);
    if (!value) return null;
    return JSON.parse(value) as T;
  } catch (err) {
    logger.warn({ err, key }, 'Cache get failed, falling through to DB');
    return null;
  }
}

/**
 * Set a cached value with TTL in seconds.
 */
export async function setCached<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
  try {
    const redis = getRedis();
    await redis.setex(key, ttlSeconds, JSON.stringify(value));
  } catch (err) {
    logger.warn({ err, key }, 'Cache set failed');
  }
}

/**
 * Invalidate (delete) a cached key.
 */
export async function invalidateCache(key: string): Promise<void> {
  try {
    const redis = getRedis();
    await redis.del(key);
  } catch (err) {
    logger.warn({ err, key }, 'Cache invalidation failed');
  }
}

/**
 * Get-or-set: load from cache, or call loader and cache the result.
 */
export async function getOrSet<T>(
  key: string,
  loader: () => Promise<T>,
  ttlSeconds: number
): Promise<T> {
  const cached = await getCached<T>(key);
  if (cached !== null) return cached;

  const value = await loader();
  await setCached(key, value, ttlSeconds);
  return value;
}
