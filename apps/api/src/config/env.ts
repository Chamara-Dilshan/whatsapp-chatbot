import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

// Load .env from repo root
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  API_PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16).optional(),
  ENCRYPTION_KEY: z.string().min(32),
  // Key rotation: ENCRYPTION_KEY_v1, ENCRYPTION_KEY_v2, etc. (optional)
  ENCRYPTION_KEY_v1: z.string().min(32).optional(),
  ENCRYPTION_KEY_v2: z.string().min(32).optional(),
  WEBHOOK_VERIFY_TOKEN: z.string().default('my-webhook-verify-token'),
  N8N_WEBHOOK_URL: z.string().url().optional(),
  AUTOMATION_API_KEY: z.string().min(8).optional(),
  CORS_ORIGIN: z.string().default('http://localhost:3001'),
  // Redis
  REDIS_URL: z.string().default('redis://localhost:6379'),
  // Stripe
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PRICE_ID_PRO: z.string().optional(),
  STRIPE_PRICE_ID_BUSINESS: z.string().optional(),
  // Dashboard URL for Stripe redirects
  DASHBOARD_URL: z.string().default('http://localhost:3001'),
  // AI Provider
  AI_PROVIDER: z.enum(['anthropic', 'openai', 'none']).default('none'),
  ANTHROPIC_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  AI_MODEL: z.string().optional(), // defaults handled per provider
  AI_TIMEOUT_MS: z.coerce.number().default(5000),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
