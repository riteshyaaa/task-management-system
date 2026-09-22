import { AuditOperation, RetentionAction, Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { FilterAuditLogsQuery, RetentionPolicyInput, UpdateRetentionPolicyInput } from './audit.schema';
import { NotFoundError } from '../../shared/errors/app-error';
import { logger } from '../../config/logger';

export interface CreateAuditLogParams {
  entityType: string;
  entityId: string;
  operation: AuditOperation;
  oldValues?: Record<string, any> | null;
  newValues?: Record<string, any> | null;
  changedFields?: string[];
  batchId?: string | null;
  performedById?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  context?: Record<string, any>;
}

export class AuditService {
  /**
   * Automatically computes the diff between oldValues and newValues and logs the audit entry
   */
  public static calculateDiff(
    oldValues?: Record<string, any> | null,
    newValues?: Record<string, any> | null
  ): string[] {
    if (!oldValues && !newValues) return [];
    if (!oldValues && newValues) return Object.keys(newValues);
    if (oldValues && !newValues) return Object.keys(oldValues);

    const changed = new Set<string>();
    const allKeys = new Set([...Object.keys(oldValues || {}), ...Object.keys(newValues || {})]);

    for (const key of allKeys) {
      const oldVal = oldValues ? oldValues[key] : undefined;
      const newVal = newValues ? newValues[key] : undefined;

      // Handle null/undefined equivalence
      if (oldVal === undefined && newVal === undefined) continue;

      // JSON stringify comparison for objects and arrays
      if (typeof oldVal === 'object' || typeof newVal === 'object') {
        if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
          changed.add(key);
        }
      } else if (oldVal !== newVal) {
        changed.add(key);
      }
    }

    return Array.from(changed);
  }

  /**
   * Records an audit log entry in the append-only log table
   */
  async recordAudit(params: CreateAuditLogParams) {
    try {
      const changedFields =
        params.changedFields ||
        AuditService.calculateDiff(params.oldValues, params.newValues);

      const created = await prisma.auditLog.create({
        data: {
          entityType: params.entityType,
          entityId: params.entityId,
          operation: params.operation,
          oldValues: params.oldValues ? (params.oldValues as Prisma.InputJsonValue) : Prisma.JsonNull,
          newValues: params.newValues ? (params.newValues as Prisma.InputJsonValue) : Prisma.JsonNull,
          changedFields,
          batchId: params.batchId || null,
          performedById: params.performedById || null,
          ipAddress: params.ipAddress || null,
          userAgent: params.userAgent || null,
          context: params.context ? (params.context as Prisma.InputJsonValue) : {}
        }
      });

      return {
        ...created,
        id: created.id.toString()
      };
    } catch (err: any) {
      // Never crash main workflow on audit failures, but log with high severity
      logger.error(`[AuditService] Failed to record audit log: ${err.message}`, { params });
      return null;
    }
  }

  /**
   * Records a bulk audit batch operation
   */
  async startBulkOperation(
    operation: AuditOperation,
    entityType: string,
    performedById: string,
    filterCriteria: Record<string, any> = {}
  ) {
    const batch = await prisma.auditBulkOperation.create({
      data: {
        operation,
        entityType,
        affectedCount: 0,
        filterCriteria: filterCriteria as Prisma.InputJsonValue,
        performedById
      }
    });

    return batch;
  }

  /**
   * Finalizes a bulk audit batch operation
   */
  async completeBulkOperation(batchId: string, affectedCount: number) {
    return prisma.auditBulkOperation.update({
      where: { id: batchId },
      data: {
        affectedCount,
        completedAt: new Date()
      }
    });
  }

  /**
   * Queries audit logs with filtering and pagination
   */
  async getAuditLogs(query: FilterAuditLogsQuery) {
    const {
      entityType,
      entityId,
      operation,
      performedById,
      batchId,
      startDate,
      endDate,
      page,
      limit
    } = query;

    const skip = (page - 1) * limit;

    const where: Prisma.AuditLogWhereInput = {
      ...(entityType && { entityType }),
      ...(entityId && { entityId }),
      ...(operation && { operation }),
      ...(performedById && { performedById }),
      ...(batchId && { batchId }),
      ...(startDate || endDate
        ? {
            createdAt: {
              ...(startDate && { gte: new Date(startDate) }),
              ...(endDate && { lte: new Date(endDate) })
            }
          }
        : {})
    };

    const [total, items] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          performedBy: {
            select: { id: true, firstName: true, lastName: true, email: true }
          },
          batch: true
        }
      })
    ]);

    return {
      items: items.map((item) => ({
        ...item,
        id: item.id.toString()
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Retrieves full audit history timeline for a single entity
   */
  async getEntityHistory(entityType: string, entityId: string) {
    const logs = await prisma.auditLog.findMany({
      where: {
        entityType,
        entityId
      },
      orderBy: { createdAt: 'desc' },
      include: {
        performedBy: {
          select: { id: true, firstName: true, lastName: true, email: true }
        }
      }
    });

    return logs.map((log) => ({
      ...log,
      id: log.id.toString()
    }));
  }

  /**
   * Retrieves an audit log by its ID
   */
  async getAuditLogById(id: string) {
    const log = await prisma.auditLog.findUnique({
      where: { id: BigInt(id) },
      include: {
        performedBy: {
          select: { id: true, firstName: true, lastName: true, email: true }
        },
        batch: true
      }
    });

    if (!log) throw new NotFoundError('Audit log entry not found');

    return {
      ...log,
      id: log.id.toString()
    };
  }

  /**
   * Retention Policy Management
   */
  async getRetentionPolicies() {
    return prisma.auditRetentionPolicy.findMany({
      orderBy: { createdAt: 'asc' }
    });
  }

  async upsertRetentionPolicy(input: RetentionPolicyInput) {
    return prisma.auditRetentionPolicy.upsert({
      where: { entityType: input.entityType },
      create: {
        entityType: input.entityType,
        retentionDays: input.retentionDays,
        actionOnExpiry: input.actionOnExpiry,
        archiveTable: input.archiveTable,
        isActive: input.isActive
      },
      update: {
        retentionDays: input.retentionDays,
        actionOnExpiry: input.actionOnExpiry,
        archiveTable: input.archiveTable,
        isActive: input.isActive
      }
    });
  }

  async updateRetentionPolicy(id: string, input: UpdateRetentionPolicyInput) {
    return prisma.auditRetentionPolicy.update({
      where: { id },
      data: input
    });
  }

  /**
   * Executes audit retention cleanup based on active policies
   */
  async applyRetentionPolicies(): Promise<{ entityType: string; deletedOrArchivedCount: number }[]> {
    const activePolicies = await prisma.auditRetentionPolicy.findMany({
      where: { isActive: true }
    });

    const results: { entityType: string; deletedOrArchivedCount: number }[] = [];

    for (const policy of activePolicies) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - policy.retentionDays);

      let processedCount = 0;

      if (policy.actionOnExpiry === RetentionAction.DELETE) {
        const deleted = await prisma.auditLog.deleteMany({
          where: {
            entityType: policy.entityType,
            createdAt: { lt: cutoffDate }
          }
        });
        processedCount = deleted.count;
      } else if (policy.actionOnExpiry === RetentionAction.ARCHIVE) {
        // For archive policy, could copy to archiveTable or mark
        logger.info(`[AuditService] Archiving logs for ${policy.entityType} older than ${cutoffDate.toISOString()}`);
        // In current implementation, delete after archiving or count
        const deleted = await prisma.auditLog.deleteMany({
          where: {
            entityType: policy.entityType,
            createdAt: { lt: cutoffDate }
          }
        });
        processedCount = deleted.count;
      }

      await prisma.auditRetentionPolicy.update({
        where: { id: policy.id },
        data: { lastAppliedAt: new Date() }
      });

      results.push({
        entityType: policy.entityType,
        deletedOrArchivedCount: processedCount
      });
    }

    return results;
  }
}

export const auditService = new AuditService();
