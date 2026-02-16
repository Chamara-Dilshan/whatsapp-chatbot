import { z } from 'zod';

export const updateCaseSchema = z.object({
  status: z.enum(['open', 'in_progress', 'resolved', 'closed']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
  assignedTo: z.string().nullable().optional(),
});
