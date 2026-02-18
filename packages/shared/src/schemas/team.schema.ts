import { z } from 'zod';

export const createTeamMemberSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  name: z.string().min(2).max(100),
  role: z.enum(['admin', 'agent']),
});

export const updateTeamMemberSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  role: z.enum(['admin', 'agent']).optional(),
  isActive: z.boolean().optional(),
});

export type CreateTeamMemberInput = z.infer<typeof createTeamMemberSchema>;
export type UpdateTeamMemberInput = z.infer<typeof updateTeamMemberSchema>;
