import { defineConfig } from 'vitest/config';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.test into process.env BEFORE any module import resolves.
// env.ts parses process.env at module load time via dotenv.config + Zod safeParse,
// so test vars must be injected here, before defineConfig is evaluated.
config({ path: resolve(__dirname, '.env.test'), override: true });

export default defineConfig({
  resolve: {
    alias: {
      // Point directly at TS source so Vitest doesn't need the compiled dist/
      '@whatsapp-bot/shared': resolve(__dirname, '../../packages/shared/src/index.ts'),
    },
  },
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['src/__tests__/setup.ts'],
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
