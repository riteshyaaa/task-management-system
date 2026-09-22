import { z } from 'zod';
import { EngagementStatus } from '@prisma/client';

const flexibleDateString = z.preprocess((val) => {
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return undefined;
    if (trimmed.includes('T')) {
      return trimmed.split('T')[0];
    }
    return trimmed;
  }
  if (val instanceof Date) {
    return val.toISOString().split('T')[0];
  }
  return val;
}, z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format (e.g. 2026-09-30)'));

const flexibleOptionalDate = z.preprocess((val) => {
  if (val === '' || val === null || val === undefined) return null;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return null;
    if (!isNaN(Date.parse(trimmed))) {
      return new Date(trimmed).toISOString();
    }
  }
  if (val instanceof Date) {
    return val.toISOString();
  }
  return val;
}, z.string().datetime().nullable().optional());

const optionalUuid = z.preprocess((val) => {
  if (val === '' || val === null || val === undefined) return null;
  return val;
}, z.string().uuid('Invalid UUID').nullable().optional());

const optionalString = z.preprocess((val) => {
  if (val === '' || val === undefined || val === null) return null;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    return trimmed === '' ? null : trimmed;
  }
  return val;
}, z.string().nullable().optional());

export const createEngagementSchema = z.object({
  clientId: z.string().uuid('Invalid client ID'),
  serviceTypeId: z.string().uuid('Invalid service type ID'),
  title: z.string().min(1, 'Engagement title is required').max(255).trim(),
  description: optionalString,
  status: z.nativeEnum(EngagementStatus).default(EngagementStatus.ACTIVE),
  periodStart: flexibleDateString,
  periodEnd: flexibleDateString,
  dueDate: flexibleOptionalDate,
  managerId: optionalUuid,
  templateId: optionalUuid,
  autoGenerateTasks: z.boolean().default(true),
  assigneeId: optionalUuid
});

export const updateEngagementSchema = z.object({
  title: z.string().min(1).max(255).trim().optional(),
  description: optionalString,
  status: z.nativeEnum(EngagementStatus).optional(),
  periodStart: flexibleDateString.optional(),
  periodEnd: flexibleDateString.optional(),
  dueDate: flexibleOptionalDate,
  managerId: optionalUuid
});

export const filterEngagementsQuerySchema = z.object({
  clientId: z.preprocess((val) => (val === '' ? undefined : val), z.string().uuid().optional()),
  serviceTypeId: z.preprocess((val) => (val === '' ? undefined : val), z.string().uuid().optional()),
  status: z.preprocess((val) => (val === '' ? undefined : val), z.nativeEnum(EngagementStatus).optional()),
  managerId: z.preprocess((val) => (val === '' ? undefined : val), z.string().uuid().optional()),
  periodStartFrom: z.preprocess((val) => (val === '' ? undefined : val), z.string().optional()),
  periodEndTo: z.preprocess((val) => (val === '' ? undefined : val), z.string().optional()),
  search: z.preprocess((val) => (val === '' ? undefined : val), z.string().optional()),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50)
});

export type CreateEngagementInput = z.infer<typeof createEngagementSchema>;
export type UpdateEngagementInput = z.infer<typeof updateEngagementSchema>;
export type FilterEngagementsQuery = z.infer<typeof filterEngagementsQuerySchema>;
