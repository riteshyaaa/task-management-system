import {
  Prisma,
  RecurrenceFrequency,
  RecurrenceStatus,
  InstanceStatus,
  TaskStatus,
  TaskPriority
} from '@prisma/client';
import { prisma } from '../../config/database';
import { NotFoundError, BadRequestError, ConflictError } from '../../shared/errors/app-error';
import {
  CreateRecurrenceRuleInput,
  UpdateRecurrenceRuleInput,
  AddExceptionDateInput,
  FilterRecurrenceRulesQuery
} from './recurring.schema';
import { RecurrenceCalculator, RecurrenceConfig } from './recurrence-calculator';
import { logger } from '../../config/logger';

export class RecurringService {
  /**
   * Creates a new recurring schedule attached to a base Task/Template
   */
  async createRecurrenceRule(userId: string, input: CreateRecurrenceRuleInput) {
    const templateTask = await prisma.task.findUnique({
      where: { id: input.taskTemplateId },
      include: { subtasks: true }
    });

    if (!templateTask || templateTask.isDeleted) {
      throw new NotFoundError('Template task not found');
    }

    const startDate = new Date(input.startDate);
    const endDate = input.endDate ? new Date(input.endDate) : null;

    if (endDate && endDate <= startDate) {
      throw new BadRequestError('End date must be strictly after start date');
    }

    // 1. Calculate the initial nextOccurrence date
    const recurrenceConfig: RecurrenceConfig = {
      frequency: input.frequency,
      interval: input.interval,
      cronExpression: input.cronExpression,
      timezone: input.timezone,
      startDate,
      endDate,
      maxOccurrences: input.maxOccurrences,
      occurrencesCreated: 0,
      weeklyDays: input.weeklyDays,
      monthlyConfig: input.monthlyConfig
    };

    const nextOccurrence = RecurrenceCalculator.getNextOccurrence(recurrenceConfig, new Date());

    // 2. Persist in database
    const rule = await prisma.$transaction(async (tx) => {
      const created = await tx.recurrenceRule.create({
        data: {
          taskTemplateId: input.taskTemplateId,
          frequency: input.frequency,
          interval: input.interval,
          cronExpression: input.cronExpression,
          timezone: input.timezone,
          startDate,
          endDate,
          maxOccurrences: input.maxOccurrences,
          occurrencesCreated: 0,
          status: RecurrenceStatus.ACTIVE,
          nextOccurrence,
          createdById: userId
        }
      });

      // Weekly days mapping
      if (input.frequency === RecurrenceFrequency.WEEKLY && input.weeklyDays && input.weeklyDays.length > 0) {
        await tx.recurrenceWeeklyDay.createMany({
          data: input.weeklyDays.map((dayOfWeek) => ({
            recurrenceRuleId: created.id,
            dayOfWeek
          }))
        });
      }

      // Monthly config mapping
      if (input.frequency === RecurrenceFrequency.MONTHLY && input.monthlyConfig) {
        await tx.recurrenceMonthlyConfig.create({
          data: {
            recurrenceRuleId: created.id,
            dayOfMonth: input.monthlyConfig.dayOfMonth,
            weekOrdinal: input.monthlyConfig.weekOrdinal,
            dayOfWeek: input.monthlyConfig.dayOfWeek
          }
        });
      }

      return created;
    });

    return this.getRecurrenceRuleById(rule.id);
  }

  /**
   * Retrieves a recurrence rule with full relations
   */
  async getRecurrenceRuleById(ruleId: string) {
    const rule = await prisma.recurrenceRule.findUnique({
      where: { id: ruleId },
      include: {
        templateTask: {
          select: {
            id: true,
            title: true,
            description: true,
            status: true,
            priority: true,
            clientId: true,
            assigneeId: true
          }
        },
        weeklyDays: true,
        monthlyConfig: true,
        exceptions: {
          orderBy: { exceptionDate: 'asc' }
        },
        createdBy: {
          select: { id: true, firstName: true, lastName: true, email: true }
        },
        _count: {
          select: {
            instances: true,
            spawnedTasks: true
          }
        }
      }
    });

    if (!rule) throw new NotFoundError('Recurrence rule not found');
    return rule;
  }

  /**
   * Lists recurrence rules with pagination and filters
   */
  async listRecurrenceRules(query: FilterRecurrenceRulesQuery) {
    const { clientId, status, frequency, page, limit } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.RecurrenceRuleWhereInput = {
      ...(status && { status }),
      ...(frequency && { frequency }),
      ...(clientId && {
        templateTask: { clientId }
      })
    };

    const [total, items] = await Promise.all([
      prisma.recurrenceRule.count({ where }),
      prisma.recurrenceRule.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          templateTask: {
            select: { id: true, title: true, priority: true, clientId: true }
          },
          weeklyDays: true,
          monthlyConfig: true,
          _count: {
            select: { instances: true, spawnedTasks: true }
          }
        }
      })
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Updates a recurrence rule configuration
   */
  async updateRecurrenceRule(ruleId: string, input: UpdateRecurrenceRuleInput) {
    const existing = await this.getRecurrenceRuleById(ruleId);

    const updated = await prisma.$transaction(async (tx) => {
      // Update weekly days if provided
      if (input.weeklyDays) {
        await tx.recurrenceWeeklyDay.deleteMany({
          where: { recurrenceRuleId: ruleId }
        });
        if (input.weeklyDays.length > 0) {
          await tx.recurrenceWeeklyDay.createMany({
            data: input.weeklyDays.map((dayOfWeek) => ({
              recurrenceRuleId: ruleId,
              dayOfWeek
            }))
          });
        }
      }

      // Update monthly config if provided
      if (input.monthlyConfig !== undefined) {
        await tx.recurrenceMonthlyConfig.deleteMany({
          where: { recurrenceRuleId: ruleId }
        });
        if (input.monthlyConfig) {
          await tx.recurrenceMonthlyConfig.create({
            data: {
              recurrenceRuleId: ruleId,
              dayOfMonth: input.monthlyConfig.dayOfMonth,
              weekOrdinal: input.monthlyConfig.weekOrdinal,
              dayOfWeek: input.monthlyConfig.dayOfWeek
            }
          });
        }
      }

      // Update primary fields
      const ruleUpdate = await tx.recurrenceRule.update({
        where: { id: ruleId },
        data: {
          interval: input.interval,
          cronExpression: input.cronExpression,
          timezone: input.timezone,
          endDate: input.endDate ? new Date(input.endDate) : input.endDate === null ? null : undefined,
          maxOccurrences: input.maxOccurrences,
          status: input.status
        }
      });

      return ruleUpdate;
    });

    // Recalculate next occurrence
    await this.recalculateNextOccurrence(ruleId);

    return this.getRecurrenceRuleById(ruleId);
  }

  /**
   * Pauses a recurrence rule
   */
  async pauseRecurrenceRule(ruleId: string) {
    const rule = await prisma.recurrenceRule.update({
      where: { id: ruleId },
      data: {
        status: RecurrenceStatus.PAUSED,
        pausedAt: new Date(),
        nextOccurrence: null
      }
    });

    return rule;
  }

  /**
   * Resumes a paused recurrence rule
   */
  async resumeRecurrenceRule(ruleId: string) {
    await prisma.recurrenceRule.update({
      where: { id: ruleId },
      data: {
        status: RecurrenceStatus.ACTIVE,
        pausedAt: null
      }
    });

    await this.recalculateNextOccurrence(ruleId);
    return this.getRecurrenceRuleById(ruleId);
  }

  /**
   * Cancels a recurrence rule
   */
  async cancelRecurrenceRule(ruleId: string) {
    return prisma.recurrenceRule.update({
      where: { id: ruleId },
      data: {
        status: RecurrenceStatus.CANCELLED,
        nextOccurrence: null
      }
    });
  }

  /**
   * Adds an exception date (e.g. holiday or blackout date)
   */
  async addExceptionDate(ruleId: string, input: AddExceptionDateInput, userId: string) {
    const exceptionDate = new Date(`${input.exceptionDate}T00:00:00.000Z`);

    const existing = await prisma.recurrenceException.findUnique({
      where: {
        recurrenceRuleId_exceptionDate: {
          recurrenceRuleId: ruleId,
          exceptionDate
        }
      }
    });

    if (existing) {
      throw new ConflictError('An exception for this date already exists');
    }

    const exception = await prisma.recurrenceException.create({
      data: {
        recurrenceRuleId: ruleId,
        exceptionDate,
        reason: input.reason,
        createdById: userId
      }
    });

    await this.recalculateNextOccurrence(ruleId);
    return exception;
  }

  /**
   * Removes an exception date
   */
  async removeExceptionDate(ruleId: string, exceptionDateStr: string) {
    const exceptionDate = new Date(`${exceptionDateStr}T00:00:00.000Z`);

    await prisma.recurrenceException.delete({
      where: {
        recurrenceRuleId_exceptionDate: {
          recurrenceRuleId: ruleId,
          exceptionDate
        }
      }
    });

    await this.recalculateNextOccurrence(ruleId);
    return { success: true, message: 'Exception date removed' };
  }

  /**
   * Spawns a new task instance from a recurrence rule
   */
  async spawnInstance(ruleId: string, scheduledForDate?: Date): Promise<string> {
    const rule = await prisma.recurrenceRule.findUnique({
      where: { id: ruleId },
      include: {
        templateTask: {
          include: {
            subtasks: { where: { isDeleted: false } },
            taskLabels: true
          }
        },
        weeklyDays: true,
        monthlyConfig: true,
        exceptions: true
      }
    });

    if (!rule) throw new NotFoundError('Recurrence rule not found');
    if (rule.status !== RecurrenceStatus.ACTIVE) {
      throw new BadRequestError('Cannot spawn instance from a non-active recurrence rule');
    }

    const scheduledDate = scheduledForDate || rule.nextOccurrence || new Date();

    // 1. Get next task number for the client
    const lastTask = await prisma.task.findFirst({
      where: { clientId: rule.templateTask.clientId },
      orderBy: { taskNumber: 'desc' },
      select: { taskNumber: true }
    });
    const nextTaskNumber = (lastTask?.taskNumber || 0) + 1;

    // 2. Instantiate the task and record the instance inside transaction
    const newTaskId = await prisma.$transaction(async (tx) => {
      // Calculate due date based on template if present (e.g. maintain relative duration)
      let instanceDueDate: Date | null = null;
      if (rule.templateTask.startDate && rule.templateTask.dueDate) {
        const durationMs = rule.templateTask.dueDate.getTime() - rule.templateTask.startDate.getTime();
        instanceDueDate = new Date(scheduledDate.getTime() + durationMs);
      }

      // Create new spawned task
      const spawned = await tx.task.create({
        data: {
          clientId: rule.templateTask.clientId,
          taskNumber: nextTaskNumber,
          title: `${rule.templateTask.title} (${scheduledDate.toISOString().substring(0, 10)})`,
          description: rule.templateTask.description,
          status: TaskStatus.TODO,
          priority: rule.templateTask.priority,
          assigneeId: rule.templateTask.assigneeId,
          reporterId: rule.createdById,
          recurrenceId: rule.id,
          startDate: scheduledDate,
          dueDate: instanceDueDate,
          estimatedHours: rule.templateTask.estimatedHours
        }
      });

      // Copy subtasks if template had any
      if (rule.templateTask.subtasks.length > 0) {
        for (let i = 0; i < rule.templateTask.subtasks.length; i++) {
          const sub = rule.templateTask.subtasks[i];
          await tx.task.create({
            data: {
              clientId: rule.templateTask.clientId,
              taskNumber: nextTaskNumber + i + 1,
              title: sub.title,
              description: sub.description,
              status: TaskStatus.TODO,
              priority: sub.priority,
              assigneeId: sub.assigneeId,
              reporterId: rule.createdById,
              parentTaskId: spawned.id,
              position: sub.position
            }
          });
        }
      }

      // Copy label mappings
      if (rule.templateTask.taskLabels.length > 0) {
        await tx.taskLabelMap.createMany({
          data: rule.templateTask.taskLabels.map((l: { labelId: string }) => ({
            taskId: spawned.id,
            labelId: l.labelId
          }))
        });
      }

      // Record RecurringTaskInstance
      await tx.recurringTaskInstance.create({
        data: {
          recurrenceRuleId: rule.id,
          generatedTaskId: spawned.id,
          scheduledFor: scheduledDate,
          generatedAt: new Date(),
          status: InstanceStatus.GENERATED
        }
      });

      // Update recurrence rule occurrence count
      const updatedOccurrences = rule.occurrencesCreated + 1;
      const isCompleted = rule.maxOccurrences ? updatedOccurrences >= rule.maxOccurrences : false;

      await tx.recurrenceRule.update({
        where: { id: rule.id },
        data: {
          occurrencesCreated: updatedOccurrences,
          status: isCompleted ? RecurrenceStatus.COMPLETED : rule.status
        }
      });

      return spawned.id;
    });

    // 3. Compute and update subsequent nextOccurrence
    await this.recalculateNextOccurrence(rule.id);

    logger.info(`[RecurringService] Spawned instance task ${newTaskId} from rule ${ruleId}`);
    return newTaskId;
  }

  /**
   * Recalculates and updates the `nextOccurrence` for a rule
   */
  async recalculateNextOccurrence(ruleId: string): Promise<Date | null> {
    const rule = await prisma.recurrenceRule.findUnique({
      where: { id: ruleId },
      include: {
        weeklyDays: true,
        monthlyConfig: true,
        exceptions: true
      }
    });

    if (!rule || rule.status !== RecurrenceStatus.ACTIVE) {
      return null;
    }

    const config: RecurrenceConfig = {
      frequency: rule.frequency,
      interval: rule.interval,
      cronExpression: rule.cronExpression,
      timezone: rule.timezone,
      startDate: rule.startDate,
      endDate: rule.endDate,
      maxOccurrences: rule.maxOccurrences,
      occurrencesCreated: rule.occurrencesCreated,
      weeklyDays: rule.weeklyDays.map((d) => d.dayOfWeek),
      monthlyConfig: rule.monthlyConfig,
      exceptionDates: rule.exceptions.map((e) => e.exceptionDate)
    };

    const nextOccurrence = RecurrenceCalculator.getNextOccurrence(config, new Date());

    await prisma.recurrenceRule.update({
      where: { id: ruleId },
      data: {
        nextOccurrence,
        ...(nextOccurrence === null && rule.maxOccurrences && rule.occurrencesCreated >= rule.maxOccurrences
          ? { status: RecurrenceStatus.COMPLETED }
          : {})
      }
    });

    return nextOccurrence;
  }
}

export const recurringService = new RecurringService();
