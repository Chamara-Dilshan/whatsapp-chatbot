import { z } from 'zod';

export const connectWhatsAppSchema = z.object({
  phoneNumberId: z.string().min(1),
  displayPhone: z.string().min(1),
  wabaId: z.string().optional(),
  accessToken: z.string().min(1),
  appSecret: z.string().min(1),
  webhookVerifyToken: z.string().min(1),
  catalogId: z.string().optional(),
});

export const updateCatalogSchema = z.object({
  catalogId: z.string().min(1),
});
