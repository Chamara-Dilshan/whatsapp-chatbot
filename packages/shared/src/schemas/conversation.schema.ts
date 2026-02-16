import { z } from 'zod';

export const conversationQuerySchema = z.object({
  status: z.string().optional(),
  assigned: z.enum(['me', 'unassigned', 'all']).default('all'),
  priority: z.string().optional(),
  tag: z.string().optional(),
  q: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export const replySchema = z.object({
  text: z.string().min(1).max(4096),
});

export const assignSchema = z.object({
  userId: z.string().min(1),
});
