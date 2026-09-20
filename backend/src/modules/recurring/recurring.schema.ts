import { z } from 'zod';
import { RecurrenceFrequency, RecurrenceStatus, DayOfWeek } from '@prisma/client';

export const dayOfWeekEnum = z.nativeEnum(DayOfWeek);
export const recurrenceFrequencyEnum = z.nativeEnum(RecurrenceFrequency);
export const recurrenceStatusEnum = z.nativeEnum(RecurrenceStatus);

export const monthlyConfigSchema = z.object({
  dayOfMonth: z.number().int().min(1).max(31).optional().nullable(),
  weekOrdinal: z.number().int().min(1).max(5).optional().nullable(), // 1st, 2nd, 3rd, 4th, 5th (or last)
  dayOfWeek: dayOfWeekEnum.optional().nullable()
}).refine(
  (data) => {
    // Either dayOfMonth is provided, OR (weekOrdinal and dayOfWeek) are provided
    return (
      (data.dayOfMonth !== undefined && data.dayOfMonth !== null) ||
      (data.weekOrdinal !== undefined && data.weekOrdinal !== null && data.dayOfWeek !== undefined && data.dayOfWeek !== null)
    );
  },
  {
    message: 'Monthly configuration must specify either dayOfMonth (1-31) OR (weekOrdinal and dayOfWeek)'
  }
);

export const createRecurrenceRuleSchema = z.object({
  taskTemplateId: z.string().uuid('Invalid task template ID'),
  frequency: recurrenceFrequencyEnum,
  interval: z.number().int().min(1).default(1),
  cronExpression: z.string().max(100).optional().nullable(),
  timezone: z.string().max(64).default('UTC'),
  startDate: z.string().datetime({ offset: true }).or(z.string().datetime()),
  endDate: z.string().datetime({ offset: true }).or(z.string().datetime()).optional().nullable(),
  maxOccurrences: z.number().int().min(1).optional().nullable(),
  weeklyDays: z.array(dayOfWeekEnum).optional().default([]),
  monthlyConfig: monthlyConfigSchema.optional().nullable()
}).refine(
  (data) => {
    if (data.frequency === RecurrenceFrequency.WEEKLY && (!data.weeklyDays || data.weeklyDays.length === 0)) {
      return false;
    }
    return true;
  },
  {
    message: 'Weekly recurrence requires at least one day of the week selected',
    path: ['weeklyDays']
  }
).refine(
  (data) => {
    if (data.frequency === RecurrenceFrequency.MONTHLY && !data.monthlyConfig) {
      return false;
    }
    return true;
  },
  {
    message: 'Monthly recurrence requires a monthlyConfig specification',
    path: ['monthlyConfig']
  }
).refine(
  (data) => {
    if (data.frequency === RecurrenceFrequency.CUSTOM_CRON && !data.cronExpression) {
      return false;
    }
    return true;
  },
  {
    message: 'Custom cron recurrence requires a cronExpression string',
    path: ['cronExpression']
  }
);

export const updateRecurrenceRuleSchema = z.object({
  interval: z.number().int().min(1).optional(),
  cronExpression: z.string().max(100).optional().nullable(),
  timezone: z.string().max(64).optional(),
  endDate: z.string().datetime({ offset: true }).or(z.string().datetime()).optional().nullable(),
  maxOccurrences: z.number().int().min(1).optional().nullable(),
  weeklyDays: z.array(dayOfWeekEnum).optional(),
  monthlyConfig: monthlyConfigSchema.optional().nullable(),
  status: recurrenceStatusEnum.optional()
});

export const addExceptionDateSchema = z.object({
  exceptionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Exception date must be in YYYY-MM-DD format'),
  reason: z.string().max(255).optional()
});

export const filterRecurrenceRulesQuerySchema = z.object({
  teamId: z.string().uuid().optional(),
  status: recurrenceStatusEnum.optional(),
  frequency: recurrenceFrequencyEnum.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

export type CreateRecurrenceRuleInput = z.infer<typeof createRecurrenceRuleSchema>;
export type UpdateRecurrenceRuleInput = z.infer<typeof updateRecurrenceRuleSchema>;
export type AddExceptionDateInput = z.infer<typeof addExceptionDateSchema>;
export type FilterRecurrenceRulesQuery = z.infer<typeof filterRecurrenceRulesQuerySchema>;
export type MonthlyConfigInput = z.infer<typeof monthlyConfigSchema>;
