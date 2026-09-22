import { z } from 'zod';
import { ClientRole } from '@prisma/client';

export const createClientSchema = z.object({
  name: z.string().min(2, 'Client name must be at least 2 characters').max(100).trim(),
  slug: z
    .string()
    .min(2)
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'Slug must only contain lowercase alphanumeric characters and hyphens')
    .optional(),
  description: z.string().max(500).optional()
});

export const updateClientSchema = z.object({
  name: z.string().min(2).max(100).trim().optional(),
  description: z.string().max(500).optional()
});

export const addClientMemberSchema = z.object({
  userId: z.string().uuid('Invalid user ID format'),
  role: z.nativeEnum(ClientRole).default(ClientRole.MEMBER)
});

export const updateClientMemberSchema = z.object({
  role: z.nativeEnum(ClientRole)
});

export type CreateClientInput = z.infer<typeof createClientSchema>;
export type UpdateClientInput = z.infer<typeof updateClientSchema>;
export type AddClientMemberInput = z.infer<typeof addClientMemberSchema>;
export type UpdateClientMemberInput = z.infer<typeof updateClientMemberSchema>;
