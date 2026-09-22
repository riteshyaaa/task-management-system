import { z } from 'zod';
import { AuditOperation, RetentionAction } from '@prisma/client';

export const auditOperationEnum = z.nativeEnum(AuditOperation);
export const retentionActionEnum = z.nativeEnum(RetentionAction);

export const filterAuditLogsQuerySchema = z.object({
  entityType: z.string().max(64).optional(),
  entityId: z.string().uuid('Invalid entity ID').optional(),
  operation: auditOperationEnum.optional(),
  performedById: z.string().uuid('Invalid user ID').optional(),
  batchId: z.string().uuid('Invalid batch ID').optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

export const retentionPolicySchema = z.object({
  entityType: z.string().min(1).max(64),
  retentionDays: z.number().int().min(1).max(3650),
  actionOnExpiry: retentionActionEnum.default(RetentionAction.ARCHIVE),
  archiveTable: z.string().max(128).optional().nullable(),
  isActive: z.boolean().default(true)
});

export const updateRetentionPolicySchema = retentionPolicySchema.partial().omit({ entityType: true });

export type FilterAuditLogsQuery = z.infer<typeof filterAuditLogsQuerySchema>;
export type RetentionPolicyInput = z.infer<typeof retentionPolicySchema>;
export type UpdateRetentionPolicyInput = z.infer<typeof updateRetentionPolicySchema>;
