import { z } from 'zod';

export const updatePoliciesSchema = z.object({
  returnPolicy: z.string().optional(),
  shippingPolicy: z.string().optional(),
  faqContent: z.string().optional(),
  businessHours: z.record(z.object({
    open: z.string(),
    close: z.string(),
  })).optional(),
  timezone: z.string().default('UTC'),
  autoReplyDelay: z.number().int().min(0).default(0),
});
