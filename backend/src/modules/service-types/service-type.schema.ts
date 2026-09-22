import { z } from 'zod';
import { RecurrenceFrequency } from '@prisma/client';

export const createServiceTypeSchema = z.object({
  name: z.string().min(1, 'Service type name is required').max(100).trim(),
  description: z.string().optional().nullable(),
  defaultCadence: z.nativeEnum(RecurrenceFrequency).default(RecurrenceFrequency.MONTHLY),
  estimatedHours: z.number().min(0).max(9999).optional().nullable(),
  isActive: z.boolean().default(true)
});

export const updateServiceTypeSchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  description: z.string().optional().nullable(),
  defaultCadence: z.nativeEnum(RecurrenceFrequency).optional(),
  estimatedHours: z.number().min(0).max(9999).optional().nullable(),
  isActive: z.boolean().optional()
});

export const filterServiceTypesQuerySchema = z.object({
  isActive: z.enum(['true', 'false']).optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50)
});

export type CreateServiceTypeInput = z.infer<typeof createServiceTypeSchema>;
export type UpdateServiceTypeInput = z.infer<typeof updateServiceTypeSchema>;
export type FilterServiceTypesQuery = z.infer<typeof filterServiceTypesQuerySchema>;
