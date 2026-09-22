import { z } from 'zod';
import { ActivityType, MetricPeriod } from '@prisma/client';

export const activityTypeEnum = z.nativeEnum(ActivityType);
export const metricPeriodEnum = z.nativeEnum(MetricPeriod);

export const recordActivitySchema = z.object({
  activityType: activityTypeEnum,
  entityType: z.string().max(64).optional(),
  entityId: z.string().uuid('Invalid entity ID').optional(),
  clientId: z.string().uuid('Invalid client ID').optional(),
  metadata: z.record(z.any()).default({}),
  sessionId: z.string().uuid('Invalid session ID').optional()
});

export const filterActivityLogsQuerySchema = z.object({
  userId: z.string().uuid('Invalid user ID').optional(),
  clientId: z.string().uuid('Invalid client ID').optional(),
  activityType: activityTypeEnum.optional(),
  entityType: z.string().max(64).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

export const velocityQuerySchema = z.object({
  clientId: z.string().uuid('Invalid client ID'),
  periodType: metricPeriodEnum.default(MetricPeriod.WEEKLY),
  limit: z.coerce.number().int().min(1).max(52).default(12)
});

export const performanceQuerySchema = z.object({
  clientId: z.string().uuid('Invalid client ID'),
  userId: z.string().uuid('Invalid user ID').optional(),
  periodType: metricPeriodEnum.default(MetricPeriod.WEEKLY),
  periodStart: z.string().optional()
});

export const createDashboardWidgetSchema = z.object({
  widgetType: z.string().min(1).max(64),
  title: z.string().max(128).optional(),
  config: z.record(z.any()).default({}),
  gridX: z.number().int().min(0).max(12).default(0),
  gridY: z.number().int().min(0).default(0),
  gridW: z.number().int().min(1).max(12).default(4),
  gridH: z.number().int().min(1).max(12).default(3),
  isVisible: z.boolean().default(true)
});

export const updateDashboardWidgetSchema = createDashboardWidgetSchema.partial();

export const batchUpdateWidgetsSchema = z.object({
  widgets: z.array(
    z.object({
      id: z.string().uuid('Invalid widget ID'),
      gridX: z.number().int().min(0).max(12),
      gridY: z.number().int().min(0),
      gridW: z.number().int().min(1).max(12),
      gridH: z.number().int().min(1).max(12),
      isVisible: z.boolean().optional()
    })
  )
});

export type RecordActivityInput = z.infer<typeof recordActivitySchema>;
export type FilterActivityLogsQuery = z.infer<typeof filterActivityLogsQuerySchema>;
export type VelocityQuery = z.infer<typeof velocityQuerySchema>;
export type PerformanceQuery = z.infer<typeof performanceQuerySchema>;
export type CreateDashboardWidgetInput = z.infer<typeof createDashboardWidgetSchema>;
export type UpdateDashboardWidgetInput = z.infer<typeof updateDashboardWidgetSchema>;
export type BatchUpdateWidgetsInput = z.infer<typeof batchUpdateWidgetsSchema>;
