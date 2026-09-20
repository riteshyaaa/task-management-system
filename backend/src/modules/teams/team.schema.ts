import { z } from 'zod';
import { TeamRole } from '@prisma/client';

export const createTeamSchema = z.object({
  name: z.string().min(2, 'Team name must be at least 2 characters').max(100).trim(),
  slug: z
    .string()
    .min(2)
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'Slug must only contain lowercase alphanumeric characters and hyphens')
    .optional(),
  description: z.string().max(500).optional()
});

export const updateTeamSchema = z.object({
  name: z.string().min(2).max(100).trim().optional(),
  description: z.string().max(500).optional()
});

export const addTeamMemberSchema = z.object({
  userId: z.string().uuid('Invalid user ID format'),
  role: z.nativeEnum(TeamRole).default(TeamRole.MEMBER)
});

export const updateTeamMemberSchema = z.object({
  role: z.nativeEnum(TeamRole)
});

export type CreateTeamInput = z.infer<typeof createTeamSchema>;
export type UpdateTeamInput = z.infer<typeof updateTeamSchema>;
export type AddTeamMemberInput = z.infer<typeof addTeamMemberSchema>;
export type UpdateTeamMemberInput = z.infer<typeof updateTeamMemberSchema>;
