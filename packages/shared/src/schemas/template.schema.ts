import { z } from 'zod';

export const createTemplateSchema = z.object({
  intent: z.string().min(1),
  name: z.string().min(1).max(100),
  body: z.string().min(1),
  isActive: z.boolean().default(true),
});

export const updateTemplateSchema = createTemplateSchema.partial();
