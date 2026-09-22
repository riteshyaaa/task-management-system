import { z } from 'zod';
import { RoleName } from '@prisma/client';

export const listUsersSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  role: z.nativeEnum(RoleName).optional(),
  isActive: z.enum(['true', 'false']).transform(val => val === 'true').optional()
});

export const updateUserSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  avatarUrl: z.string().url().optional().nullable(),
  isActive: z.boolean().optional()
});

export const assignRolesSchema = z.object({
  roleNames: z.array(z.nativeEnum(RoleName)).min(1, 'At least one role must be provided')
});

export type ListUsersQuery = z.infer<typeof listUsersSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type AssignRolesInput = z.infer<typeof assignRolesSchema>;
