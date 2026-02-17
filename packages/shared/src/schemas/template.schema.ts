import { z } from 'zod';

export const createTemplateSchema = z.object({
  intent: z.string().min(1),
  name: z.string().min(1).max(100),
  body: z.string().min(1),
  isActive: z.boolean().default(true),
  // Phase 3: language & tone
  language: z.enum(['EN', 'SI', 'TA']).default('EN'),
  tone: z.enum(['FRIENDLY', 'FORMAL', 'SHORT']).default('FRIENDLY'),
});

export const updateTemplateSchema = createTemplateSchema.partial();
