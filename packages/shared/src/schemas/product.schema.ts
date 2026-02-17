import { z } from 'zod';

export const createProductSchema = z.object({
  retailerId: z.string().min(1),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  price: z.number().positive(),
  currency: z.string().length(3).default('USD'),
  imageUrl: z.string().url().optional(),
  category: z.string().optional(),
  keywords: z.array(z.string()).default([]),
  inStock: z.boolean().default(true),
});

export const updateProductSchema = createProductSchema.partial();

export const productQuerySchema = z.object({
  query: z.string().optional(),
  category: z.string().optional(),
  inStock: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export const csvImportResultSchema = z.object({
  imported: z.number(),
  skipped: z.number(),
  errors: z.array(z.object({
    row: z.number(),
    error: z.string(),
  })),
});
