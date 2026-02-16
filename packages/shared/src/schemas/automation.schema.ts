import { z } from 'zod';

export const sendTemplateActionSchema = z.object({
  tenantId: z.string().min(1),
  toWaId: z.string().min(1),
  templateName: z.string().min(1),
  params: z.record(z.string()).optional(),
});

export const importProductsActionSchema = z.object({
  tenantId: z.string().min(1),
  csvUrl: z.string().url().optional(),
  products: z.array(z.object({
    retailerId: z.string().min(1),
    name: z.string().min(1),
    description: z.string().optional(),
    price: z.number().positive(),
    currency: z.string().default('USD'),
    category: z.string().optional(),
  })).optional(),
});

export const tagConversationActionSchema = z.object({
  tenantId: z.string().min(1),
  conversationId: z.string().min(1),
  tags: z.array(z.string().min(1)),
});
