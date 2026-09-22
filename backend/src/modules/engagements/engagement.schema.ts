import { z } from 'zod';
import { EngagementStatus } from '@prisma/client';

export const createEngagementSchema = z.object({
  clientId: z.string().uuid('Invalid client ID'),
  serviceTypeId: z.string().uuid('Invalid service type ID'),
  title: z.string().min(1, 'Engagement title is required').max(255).trim(),
  description: z.string().optional().nullable(),
  status: z.nativeEnum(EngagementStatus).default(EngagementStatus.ACTIVE),
  periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'periodStart must be in YYYY-MM-DD format'),
  periodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'periodEnd must be in YYYY-MM-DD format'),
  dueDate: z.string().datetime().optional().nullable(),
  managerId: z.string().uuid('Invalid manager ID').optional().nullable(),
  templateId: z.string().uuid('Invalid template ID').optional().nullable(),
  autoGenerateTasks: z.boolean().default(true),
  assigneeId: z.string().uuid('Invalid assignee ID').optional().nullable()
});

export const updateEngagementSchema = z.object({
  title: z.string().min(1).max(255).trim().optional(),
  description: z.string().optional().nullable(),
  status: z.nativeEnum(EngagementStatus).optional(),
  periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  periodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dueDate: z.string().datetime().optional().nullable(),
  managerId: z.string().uuid().optional().nullable()
});

export const filterEngagementsQuerySchema = z.object({
  clientId: z.string().uuid().optional(),
  serviceTypeId: z.string().uuid().optional(),
  status: z.nativeEnum(EngagementStatus).optional(),
  managerId: z.string().uuid().optional(),
  periodStartFrom: z.string().optional(),
  periodEndTo: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50)
});

export type CreateEngagementInput = z.infer<typeof createEngagementSchema>;
export type UpdateEngagementInput = z.infer<typeof updateEngagementSchema>;
export type FilterEngagementsQuery = z.infer<typeof filterEngagementsQuerySchema>;
