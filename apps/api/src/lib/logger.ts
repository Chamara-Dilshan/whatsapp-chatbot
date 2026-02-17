import pino from 'pino';
import { env } from '../config/env';

/**
 * Sensitive fields that must never appear in logs in plaintext.
 * Pino's `redact` option replaces their values with "[Redacted]".
 */
const REDACTED_FIELDS = [
  'accessToken',
  'accessTokenEnc',
  'appSecret',
  'appSecretEnc',
  'passwordHash',
  'password',
  'token',
  'refreshToken',
  'stripeCustomerId',
  'stripeSubscriptionId',
  // Nested variants
  'data.accessToken',
  'data.token',
  'user.passwordHash',
  'body.password',
  'body.accessToken',
];

export const logger = pino({
  level: env.NODE_ENV === 'development' ? 'debug' : 'info',
  redact: {
    paths: REDACTED_FIELDS,
    censor: '[Redacted]',
  },
  transport:
    env.NODE_ENV === 'development'
      ? {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'SYS:standard' },
        }
      : undefined,
});
