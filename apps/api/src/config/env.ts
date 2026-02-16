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
  ENCRYPTION_KEY: z.string().min(32),
  WEBHOOK_VERIFY_TOKEN: z.string().default('my-webhook-verify-token'),
  N8N_WEBHOOK_URL: z.string().url().optional(),
  AUTOMATION_API_KEY: z.string().min(8).optional(),
  CORS_ORIGIN: z.string().default('http://localhost:3001'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
