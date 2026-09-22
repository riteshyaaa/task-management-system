import { TaskStatus, TaskPriority, ActivityType, AuditOperation, Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { NotFoundError, BadRequestError, ForbiddenError, ConflictError } from '../../shared/errors/app-error';
import { CreateTaskInput, UpdateTaskInput, FilterTasksQuery, ReorderTaskInput } from './task.schema';
import { AuditContext } from '../../shared/types/express';
import { auditService } from '../audit/audit.service';

export class TaskService {
  /**
   * Create a new task or subtask
   */
  async createTask(reporterId: string, input: CreateTaskInput, auditContext?: AuditContext) {
    // If parentTaskId is provided, verify it exists and belongs to the same client
    if (input.parentTaskId) {
      const parent = await prisma.task.findUnique({
        where: { id: input.parentTaskId }
      });
      if (!parent || parent.isDeleted) {
        throw new NotFoundError('Parent task not found or has been deleted');
      }
      if (parent.clientId !== input.clientId) {
        throw new BadRequestError('Parent task belongs to a different client workspace');
      }
    }

    // Determine position: append to highest position in client + status
    const maxPosAggregate = await prisma.task.aggregate({
      where: {
        clientId: input.clientId,
        status: input.status,
        isDeleted: false
      },
      _max: { position: true }
    });
    const position = (maxPosAggregate._max.position ?? -1) + 1;

    const task = await prisma.task.create({
      data: {
        title: input.title,
        description: input.description,
        clientId: input.clientId,
        engagementId: input.engagementId,
        reporterId,
        assigneeId: input.assigneeId,
        status: input.status,
        priority: input.priority,
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
        startDate: input.startDate ? new Date(input.startDate) : null,
        estimatedHours: input.estimatedHours !== undefined && input.estimatedHours !== null
          ? new Prisma.Decimal(input.estimatedHours)
          : null,
        parentTaskId: input.parentTaskId,
        templateId: input.templateId,
        position,
        metadata: input.metadata || {},
        watchers: {
          create: {
            userId: reporterId
          }
        },
        taskLabels: input.labelIds && input.labelIds.length > 0
          ? {
              create: input.labelIds.map(labelId => ({
                labelId
              }))
            }
          : undefined
      },
      include: {
        assignee: {
          select: { id: true, email: true, firstName: true, lastName: true, avatarUrl: true }
        },
        reporter: {
          select: { id: true, email: true, firstName: true, lastName: true, avatarUrl: true }
        },
        engagement: {
          select: { id: true, title: true, serviceType: { select: { id: true, name: true } } }
        },
        taskLabels: {
          include: {
            label: true
          }
        },
        subtasks: {
          where: { isDeleted: false },
          select: { id: true, taskNumber: true, title: true, status: true, priority: true }
        },
        _count: {
          select: { comments: true, watchers: true, subtasks: true }
        }
      }
    });

    // Log Activity
    await prisma.userActivityLog.create({
      data: {
        userId: reporterId,
        activityType: ActivityType.TASK_CREATE,
        entityType: 'Task',
        entityId: task.id,
        clientId: input.clientId,
        ipAddress: auditContext?.ipAddress,
        metadata: {
          title: task.title,
          status: task.status,
          priority: task.priority
        }
      }
    });

    // Record Audit
    await auditService.recordAudit({
      entityType: 'Task',
      entityId: task.id,
      operation: AuditOperation.CREATE,
      newValues: task as any,
      performedById: reporterId,
      ipAddress: auditContext?.ipAddress,
      userAgent: auditContext?.userAgent
    });

    return task;
  }

  /**
   * List tasks with comprehensive filtering and pagination
   */
  async listTasks(clientId?: string, query: Partial<FilterTasksQuery> = {}) {
    const where: Prisma.TaskWhereInput = {
      isDeleted: false
    };

    if (clientId) {
      where.clientId = clientId;
    } else if (query.clientId) {
      where.clientId = query.clientId;
    }

    if (query.engagementId) {
      where.engagementId = query.engagementId;
    }

    // Filter by status (single or array)
    if (query.status) {
      if (Array.isArray(query.status)) {
        where.status = { in: query.status };
      } else {
        where.status = query.status;
      }
    }

    // Filter by priority (single or array)
    if (query.priority) {
      if (Array.isArray(query.priority)) {
        where.priority = { in: query.priority };
      } else {
        where.priority = query.priority;
      }
    }

    // Filter by assignee
    if (query.assigneeId !== undefined) {
      where.assigneeId = query.assigneeId;
    }

    // Filter by reporter
    if (query.reporterId) {
      where.reporterId = query.reporterId;
    }

    // Subtasks vs Root tasks
    if (query.isSubtask === 'true') {
      where.parentTaskId = { not: null };
    } else if (query.isSubtask === 'false') {
      where.parentTaskId = null;
    } else if (query.parentTaskId !== undefined) {
      where.parentTaskId = query.parentTaskId;
    }

    // Filter by label
    if (query.labelId) {
      where.taskLabels = {
        some: { labelId: query.labelId }
      };
    }

    // Due date range
    if (query.dueDateFrom || query.dueDateTo) {
      where.dueDate = {};
      if (query.dueDateFrom) where.dueDate.gte = new Date(query.dueDateFrom);
      if (query.dueDateTo) where.dueDate.lte = new Date(query.dueDateTo);
    }

    // Search keyword in title or description
    if (query.search && query.search.trim() !== '') {
      where.OR = [
        { title: { contains: query.search.trim(), mode: 'insensitive' } },
        { description: { contains: query.search.trim(), mode: 'insensitive' } }
      ];
    }

    const page = query.page || 1;
    const limit = query.limit || 50;
    const skip = (page - 1) * limit;

    const orderBy: Prisma.TaskOrderByWithRelationInput = {};
    if (query.sortBy === 'position') {
      orderBy.position = query.sortOrder;
    } else if (query.sortBy === 'dueDate') {
      orderBy.dueDate = query.sortOrder;
    } else if (query.sortBy === 'priority') {
      orderBy.priority = query.sortOrder;
    } else if (query.sortBy === 'taskNumber') {
      orderBy.taskNumber = query.sortOrder;
    } else {
      orderBy.createdAt = query.sortOrder;
    }

    const [total, tasks] = await Promise.all([
      prisma.task.count({ where }),
      prisma.task.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          assignee: {
            select: { id: true, email: true, firstName: true, lastName: true, avatarUrl: true }
          },
          reporter: {
            select: { id: true, email: true, firstName: true, lastName: true, avatarUrl: true }
          },
          engagement: {
            select: { id: true, title: true, serviceType: { select: { id: true, name: true } } }
          },
          taskLabels: {
            include: {
              label: true
            }
          },
          subtasks: {
            where: { isDeleted: false },
            select: { id: true, taskNumber: true, title: true, status: true, priority: true }
          },
          workflowAssignment: {
            include: {
              currentState: true
            }
          },
          _count: {
            select: { comments: true, watchers: true, subtasks: true }
          }
        }
      })
    ]);

    return {
      items: tasks,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get single task by ID with full details
   */
  async getTaskById(taskId: string, clientId?: string) {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        assignee: {
          select: { id: true, email: true, firstName: true, lastName: true, avatarUrl: true }
        },
        reporter: {
          select: { id: true, email: true, firstName: true, lastName: true, avatarUrl: true }
        },
        engagement: {
          select: { id: true, title: true, status: true, periodStart: true, periodEnd: true, serviceType: { select: { id: true, name: true } } }
        },
        taskLabels: {
          include: {
            label: true
          }
        },
        parentTask: {
          select: { id: true, taskNumber: true, title: true, status: true }
        },
        subtasks: {
          where: { isDeleted: false },
          orderBy: { position: 'asc' },
          include: {
            assignee: {
              select: { id: true, firstName: true, lastName: true, avatarUrl: true }
            }
          }
        },
        watchers: {
          include: {
            user: {
              select: { id: true, email: true, firstName: true, lastName: true, avatarUrl: true }
            }
          }
        },
        workflowAssignment: {
          include: {
            currentState: true,
            workflow: {
              select: { id: true, name: true, version: true }
            }
          }
        },
        _count: {
          select: { comments: true, watchers: true, subtasks: true }
        }
      }
    });

    if (!task || task.isDeleted) {
      throw new NotFoundError('Task not found or has been deleted');
    }

    if (clientId && task.clientId !== clientId) {
      throw new BadRequestError('Task does not belong to the specified client workspace');
    }

    return task;
  }

  /**
   * Update task with optimistic concurrency locking, label sync, and security enforcement
   */
  async updateTask(
    taskId: string,
    userId: string,
    input: UpdateTaskInput,
    userRoles?: string[],
    auditContext?: AuditContext
  ) {
    const task = await prisma.task.findUnique({
      where: { id: taskId }
    });

    if (!task || task.isDeleted) {
      throw new NotFoundError('Task not found or has been deleted');
    }

    const isPrivileged = userRoles && (userRoles.includes('ADMIN') || userRoles.includes('MANAGER'));

    // Server-Side Security Rule: Task ownership protection
    // TEAM_MEMBER cannot modify tasks assigned to another member
    if (!isPrivileged && task.assigneeId && task.assigneeId !== userId) {
      throw new ForbiddenError('Team members cannot modify tasks assigned to another team member');
    }

    // Server-Side Security Rule: Self-approval prevention
    // When a task is in READY_FOR_REVIEW (or REVIEW), the assignee cannot transition to COMPLETED (or DONE)
    const isCurrentlyInReview = task.status === TaskStatus.READY_FOR_REVIEW || (task.status as any) === 'REVIEW';
    const isTargetCompleted = input.status === TaskStatus.COMPLETED || (input.status as any) === 'DONE';

    if (isCurrentlyInReview && isTargetCompleted && task.assigneeId === userId) {
      throw new ForbiddenError('Assignees are not permitted to approve or complete their own tasks');
    }

    // Optimistic Concurrency Control
    if (input.version !== undefined && input.version !== task.version) {
      throw new ConflictError(
        `Optimistic lock conflict: Task has been modified by another user (expected version ${input.version}, found ${task.version}). Please refresh and retry.`,
        undefined,
        'OCC_CONFLICT'
      );
    }

    // Handle CompletedAt automation
    let completedAt = input.completedAt ? new Date(input.completedAt) : undefined;
    if (
      (input.status === TaskStatus.COMPLETED || input.status === TaskStatus.DONE) &&
      !task.completedAt &&
      !completedAt
    ) {
      completedAt = new Date();
    } else if (
      input.status &&
      input.status !== TaskStatus.COMPLETED &&
      input.status !== TaskStatus.DONE
    ) {
      completedAt = null as any;
    }

    // Update labels if provided
    if (input.labelIds !== undefined) {
      await prisma.taskLabelMap.deleteMany({
        where: { taskId }
      });
      if (input.labelIds.length > 0) {
        await prisma.taskLabelMap.createMany({
          data: input.labelIds.map(labelId => ({
            taskId,
            labelId
          }))
        });
      }
    }

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: {
        title: input.title,
        description: input.description,
        status: input.status,
        priority: input.priority,
        dueDate: input.dueDate !== undefined ? (input.dueDate ? new Date(input.dueDate) : null) : undefined,
        startDate: input.startDate !== undefined ? (input.startDate ? new Date(input.startDate) : null) : undefined,
        completedAt,
        estimatedHours: input.estimatedHours !== undefined ? (input.estimatedHours !== null ? new Prisma.Decimal(input.estimatedHours) : null) : undefined,
        actualHours: input.actualHours !== undefined ? (input.actualHours !== null ? new Prisma.Decimal(input.actualHours) : null) : undefined,
        assigneeId: input.assigneeId !== undefined ? input.assigneeId : undefined,
        engagementId: input.engagementId !== undefined ? input.engagementId : undefined,
        parentTaskId: input.parentTaskId !== undefined ? input.parentTaskId : undefined,
        position: input.position !== undefined ? input.position : undefined,
        metadata: input.metadata || undefined,
        version: { increment: 1 }
      },
      include: {
        assignee: {
          select: { id: true, email: true, firstName: true, lastName: true, avatarUrl: true }
        },
        reporter: {
          select: { id: true, email: true, firstName: true, lastName: true, avatarUrl: true }
        },
        engagement: {
          select: { id: true, title: true, serviceType: { select: { id: true, name: true } } }
        },
        taskLabels: {
          include: {
            label: true
          }
        },
        subtasks: {
          where: { isDeleted: false },
          select: { id: true, taskNumber: true, title: true, status: true }
        }
      }
    });

    // Log Activity
    const activityType =
      input.status === TaskStatus.COMPLETED || input.status === TaskStatus.DONE
        ? ActivityType.TASK_COMPLETE
        : ActivityType.TASK_UPDATE;

    await prisma.userActivityLog.create({
      data: {
        userId,
        activityType,
        entityType: 'Task',
        entityId: task.id,
        clientId: task.clientId,
        ipAddress: auditContext?.ipAddress,
        metadata: {
          updatedFields: Object.keys(input),
          status: updatedTask.status
        }
      }
    });

    // Record Audit
    await auditService.recordAudit({
      entityType: 'Task',
      entityId: task.id,
      operation: AuditOperation.UPDATE,
      oldValues: task as any,
      newValues: updatedTask as any,
      performedById: userId,
      ipAddress: auditContext?.ipAddress,
      userAgent: auditContext?.userAgent
    });

    return updatedTask;
  }

  /**
   * Approve task review: Transition from READY_FOR_REVIEW -> COMPLETED
   */
  async approveTask(taskId: string, userId: string, auditContext?: AuditContext) {
    const task = await prisma.task.findUnique({
      where: { id: taskId }
    });

    if (!task || task.isDeleted) {
      throw new NotFoundError('Task not found or has been deleted');
    }

    if (task.status !== TaskStatus.READY_FOR_REVIEW && (task.status as any) !== 'REVIEW') {
      throw new BadRequestError(`Task is not ready for review (current status: ${task.status})`);
    }

    // Self-approval prevention
    if (task.assigneeId === userId) {
      throw new ForbiddenError('Assignees are not permitted to approve their own tasks');
    }

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: {
        status: TaskStatus.COMPLETED,
        completedAt: new Date(),
        version: { increment: 1 }
      },
      include: {
        assignee: {
          select: { id: true, email: true, firstName: true, lastName: true, avatarUrl: true }
        },
        reporter: {
          select: { id: true, email: true, firstName: true, lastName: true, avatarUrl: true }
        }
      }
    });

    // Add approval comment
    await prisma.taskComment.create({
      data: {
        taskId,
        userId,
        content: 'Task reviewed and approved.'
      }
    });

    // Log Activity
    await prisma.userActivityLog.create({
      data: {
        userId,
        activityType: ActivityType.TASK_COMPLETE,
        entityType: 'Task',
        entityId: task.id,
        clientId: task.clientId,
        ipAddress: auditContext?.ipAddress,
        metadata: {
          action: 'TASK_APPROVED',
          fromStatus: task.status,
          toStatus: TaskStatus.COMPLETED
        }
      }
    });

    // Record Audit
    await auditService.recordAudit({
      entityType: 'Task',
      entityId: task.id,
      operation: AuditOperation.UPDATE,
      oldValues: task as any,
      newValues: updatedTask as any,
      performedById: userId,
      ipAddress: auditContext?.ipAddress,
      userAgent: auditContext?.userAgent
    });

    return updatedTask;
  }

  /**
   * Request changes on task: Transition from READY_FOR_REVIEW -> CHANGES_REQUESTED
   */
  async requestChanges(taskId: string, userId: string, reason: string, auditContext?: AuditContext) {
    const task = await prisma.task.findUnique({
      where: { id: taskId }
    });

    if (!task || task.isDeleted) {
      throw new NotFoundError('Task not found or has been deleted');
    }

    if (task.status !== TaskStatus.READY_FOR_REVIEW && (task.status as any) !== 'REVIEW') {
      throw new BadRequestError(`Task is not in review state (current status: ${task.status})`);
    }

    if (!reason || reason.trim() === '') {
      throw new BadRequestError('A reason/feedback must be provided when requesting changes');
    }

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: {
        status: TaskStatus.CHANGES_REQUESTED,
        version: { increment: 1 }
      },
      include: {
        assignee: {
          select: { id: true, email: true, firstName: true, lastName: true, avatarUrl: true }
        },
        reporter: {
          select: { id: true, email: true, firstName: true, lastName: true, avatarUrl: true }
        }
      }
    });

    // Add feedback comment
    await prisma.taskComment.create({
      data: {
        taskId,
        userId,
        content: `Changes Requested: ${reason.trim()}`
      }
    });

    // Log Activity
    await prisma.userActivityLog.create({
      data: {
        userId,
        activityType: ActivityType.TASK_UPDATE,
        entityType: 'Task',
        entityId: task.id,
        clientId: task.clientId,
        ipAddress: auditContext?.ipAddress,
        metadata: {
          action: 'CHANGES_REQUESTED',
          reason: reason.trim()
        }
      }
    });

    // Record Audit
    await auditService.recordAudit({
      entityType: 'Task',
      entityId: task.id,
      operation: AuditOperation.UPDATE,
      oldValues: task as any,
      newValues: updatedTask as any,
      performedById: userId,
      ipAddress: auditContext?.ipAddress,
      userAgent: auditContext?.userAgent
    });

    return updatedTask;
  }

  /**
   * Reorder task within or across status columns (Kanban drag-and-drop)
   */
  async reorderTask(clientId: string, input: ReorderTaskInput) {
    const task = await prisma.task.findUnique({
      where: { id: input.taskId }
    });

    if (!task || task.isDeleted || task.clientId !== clientId) {
      throw new NotFoundError('Task not found in this client workspace');
    }

    const currentStatus = task.status;
    const targetStatus = input.targetStatus || currentStatus;
    const targetPosition = input.targetPosition;

    await prisma.$transaction(async tx => {
      // Shift subsequent tasks up in target status column
      await tx.task.updateMany({
        where: {
          clientId,
          status: targetStatus,
          isDeleted: false,
          position: { gte: targetPosition },
          id: { not: input.taskId }
        },
        data: {
          position: { increment: 1 }
        }
      });

      // Update the moved task
      await tx.task.update({
        where: { id: input.taskId },
        data: {
          status: targetStatus,
          position: targetPosition,
          completedAt:
            targetStatus === TaskStatus.COMPLETED || targetStatus === TaskStatus.DONE
              ? new Date()
              : currentStatus === TaskStatus.COMPLETED || currentStatus === TaskStatus.DONE
              ? null
              : undefined,
          version: { increment: 1 }
        }
      });
    });

    return this.getTaskById(input.taskId, clientId);
  }

  /**
   * Soft-delete task
   */
  async deleteTask(taskId: string, userId: string, auditContext?: AuditContext) {
    const task = await prisma.task.findUnique({
      where: { id: taskId }
    });

    if (!task || task.isDeleted) {
      throw new NotFoundError('Task not found');
    }

    await prisma.task.update({
      where: { id: taskId },
      data: {
        isDeleted: true,
        deletedAt: new Date()
      }
    });

    // Also soft-delete all child subtasks
    await prisma.task.updateMany({
      where: { parentTaskId: taskId },
      data: {
        isDeleted: true,
        deletedAt: new Date()
      }
    });

    // Record Audit
    await auditService.recordAudit({
      entityType: 'Task',
      entityId: taskId,
      operation: AuditOperation.DELETE,
      oldValues: task as any,
      performedById: userId,
      ipAddress: auditContext?.ipAddress,
      userAgent: auditContext?.userAgent
    });

    return { message: 'Task and all subtasks deleted successfully' };
  }

  /**
   * Add watcher to task
   */
  async addWatcher(taskId: string, userId: string) {
    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task || task.isDeleted) throw new NotFoundError('Task not found');

    const watcher = await prisma.taskWatcher.upsert({
      where: {
        taskId_userId: { taskId, userId }
      },
      create: { taskId, userId },
      update: {},
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true, avatarUrl: true }
        }
      }
    });

    return watcher;
  }

  /**
   * Remove watcher from task
   */
  async removeWatcher(taskId: string, userId: string) {
    await prisma.taskWatcher.deleteMany({
      where: { taskId, userId }
    });

    return { message: 'Watcher removed successfully' };
  }

  /**
   * Add a subtask to a parent task
   */
  async addSubtask(
    parentTaskId: string,
    reporterId: string,
    input: { title: string; description?: string; assigneeId?: string },
    auditContext?: AuditContext
  ) {
    const parent = await prisma.task.findUnique({
      where: { id: parentTaskId }
    });
    if (!parent || parent.isDeleted) {
      throw new NotFoundError('Parent task not found or has been deleted');
    }

    const subtask = await this.createTask(
      reporterId,
      {
        title: input.title,
        description: input.description,
        clientId: parent.clientId,
        parentTaskId: parent.id,
        assigneeId: input.assigneeId,
        status: TaskStatus.NOT_STARTED,
        priority: TaskPriority.MEDIUM,
        labelIds: [],
        metadata: {}
      },
      auditContext
    );

    return {
      ...subtask,
      isCompleted: subtask.status === TaskStatus.COMPLETED || (subtask.status as any) === TaskStatus.DONE
    };
  }
}

export const taskService = new TaskService();
