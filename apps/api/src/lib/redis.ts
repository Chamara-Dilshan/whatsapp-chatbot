/**
 * ioredis singleton.
 * Connect once, reuse across the app.
 */
import Redis from 'ioredis';
import { env } from '../config/env';
import { logger } from './logger';

let _redis: Redis | null = null;

export function getRedis(): Redis {
  if (!_redis) {
    _redis = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: null, // Required by BullMQ
      enableReadyCheck: false,
      lazyConnect: false,
    });

    _redis.on('error', (err) => {
      logger.error({ err }, 'Redis connection error');
    });

    _redis.on('connect', () => {
      logger.info('Redis connected');
    });
  }
  return _redis;
}

export default getRedis;
