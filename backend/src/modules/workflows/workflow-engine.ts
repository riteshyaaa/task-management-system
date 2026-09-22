import {
  Prisma,
  TransitionConditionType,
  HookEventType,
  NotificationType,
  TaskStatus,
  ActivityType,
  ClientRole
} from '@prisma/client';
import { prisma } from '../../config/database';
import { logger } from '../../config/logger';
import { NotFoundError, BadRequestError, ForbiddenError } from '../../shared/errors/app-error';
import { AuditContext } from '../../shared/types/express';

export interface TransitionContext {
  task: any;
  user: any;
  clientMember?: any;
  fromState: any;
  toState: any;
  transition: any;
}

export class WorkflowEngine {
  /**
   * Evaluates guard conditions for a transition
   */
  public async evaluateConditions(
    conditions: any[],
    context: TransitionContext
  ): Promise<{ passed: boolean; failedReason?: string }> {
    for (const condition of conditions) {
      const config = (condition.config as Record<string, any>) || {};
      const { conditionType, errorMessage } = condition;

      switch (conditionType) {
        case TransitionConditionType.ROLE_CHECK: {
          const allowedRoles: string[] = config.allowedRoles || [];
          const userSystemRoles: string[] = context.user.userRoles?.map((ur: any) => ur.role?.name) || [];
          const userClientRole = context.clientMember?.role;

          const hasPermission =
            allowedRoles.some((r: string) => userSystemRoles.includes(r)) ||
            (userClientRole && allowedRoles.includes(userClientRole)) ||
            userSystemRoles.includes('ADMIN');

          if (!hasPermission) {
            return {
              passed: false,
              failedReason:
                errorMessage ||
                `You do not have the required role (${allowedRoles.join(', ')}) to perform this transition.`
            };
          }
          break;
        }

        case TransitionConditionType.FIELD_VALUE: {
          const rule = config.rule; // e.g. 'ALL_SUBTASKS_COMPLETED', 'HAS_ASSIGNEE', 'HAS_ESTIMATED_HOURS'

          if (rule === 'ALL_SUBTASKS_COMPLETED') {
            const incompleteSubtasks = await prisma.task.count({
              where: {
                parentTaskId: context.task.id,
                isDeleted: false,
                status: { not: TaskStatus.DONE }
              }
            });

            if (incompleteSubtasks > 0) {
              return {
                passed: false,
                failedReason:
                  errorMessage ||
                  `All subtasks must be completed before transitioning to ${context.toState.name} (${incompleteSubtasks} subtasks pending).`
              };
            }
          }

          if (rule === 'HAS_ASSIGNEE' && !context.task.assigneeId) {
            return {
              passed: false,
              failedReason: errorMessage || 'Task must have an assignee before this transition.'
            };
          }

          if (rule === 'HAS_ESTIMATED_HOURS' && !context.task.estimatedHours) {
            return {
              passed: false,
              failedReason: errorMessage || 'Task must specify estimated hours before this transition.'
            };
          }
          break;
        }

        case TransitionConditionType.TIME_ELAPSED: {
          const minDurationMinutes = config.minDurationMinutes || 0;
          if (minDurationMinutes > 0) {
            const assignment = await prisma.taskWorkflowAssignment.findUnique({
              where: { taskId: context.task.id }
            });
            if (assignment) {
              const elapsedMs = Date.now() - new Date(assignment.enteredStateAt).getTime();
              const elapsedMinutes = elapsedMs / (1000 * 60);
              if (elapsedMinutes < minDurationMinutes) {
                return {
                  passed: false,
                  failedReason:
                    errorMessage ||
                    `Task must remain in current state for at least ${minDurationMinutes} minutes before moving.`
                };
              }
            }
          }
          break;
        }

        default:
          break;
      }
    }

    return { passed: true };
  }

  /**
   * Executes side-effect hooks attached to a transition
   */
  public async executeHooks(hooks: any[], context: TransitionContext): Promise<void> {
    for (const hook of hooks) {
      if (!hook.isActive) continue;

      const config = (hook.config as Record<string, any>) || {};
      const { hookType } = hook;

      try {
        switch (hookType) {
          case HookEventType.NOTIFY_ASSIGNEE: {
            if (context.task.assigneeId) {
              await prisma.notification.create({
                data: {
                  userId: context.task.assigneeId,
                  type: NotificationType.WORKFLOW_TRANSITION,
                  title: 'Task Status Updated',
                  message: `Task #${context.task.taskNumber} moved from '${context.fromState.name}' to '${context.toState.name}'`,
                  data: {
                    taskId: context.task.id,
                    fromState: context.fromState.name,
                    toState: context.toState.name
                  }
                }
              });
            }
            break;
          }

          case HookEventType.CREATE_SUBTASK: {
            if (config.title) {
              await prisma.task.create({
                data: {
                  title: config.title,
                  description: config.description || null,
                  clientId: context.task.clientId,
                  reporterId: context.user.id,
                  assigneeId: config.assigneeId || context.task.assigneeId || null,
                  parentTaskId: context.task.id,
                  status: TaskStatus.TODO,
                  priority: context.task.priority
                }
              });
            }
            break;
          }

          case HookEventType.UPDATE_FIELD: {
            if (config.field && config.value !== undefined) {
              const updateData: Record<string, any> = {};
              updateData[config.field] = config.value;
              await prisma.task.update({
                where: { id: context.task.id },
                data: updateData
              });
            }
            break;
          }

          case HookEventType.WEBHOOK: {
            logger.info(
              `[WorkflowEngine] Webhook hook dispatched for transition to '${context.toState.slug}'`
            );
            break;
          }

          default:
            break;
        }
      } catch (err: any) {
        logger.error(`[WorkflowEngine] Hook execution failed for ${hookType}: ${err.message}`);
      }
    }
  }

  /**
   * Helper to map workflow state slug to core TaskStatus enum if standard
   */
  public mapStateSlugToTaskStatus(slug: string): TaskStatus | null {
    const normalized = slug.toLowerCase().replace(/[-_]/g, '');
    if (normalized === 'todo' || normalized === 'backlog' || normalized === 'open') {
      return TaskStatus.TODO;
    }
    if (normalized === 'inprogress' || normalized === 'doing' || normalized === 'development') {
      return TaskStatus.IN_PROGRESS;
    }
    if (normalized === 'review' || normalized === 'inreview' || normalized === 'qa' || normalized === 'testing') {
      return TaskStatus.REVIEW;
    }
    if (normalized === 'done' || normalized === 'completed' || normalized === 'closed' || normalized === 'resolved') {
      return TaskStatus.DONE;
    }
    return null;
  }

  /**
   * Performs an atomic state transition on a task
   */
  public async transitionTask(
    taskId: string,
    toStateIdentifier: { stateId?: string; stateSlug?: string },
    userId: string,
    comment?: string,
    auditContext?: AuditContext
  ) {
    // 1. Fetch Task with current assignment and workflow definition
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        workflowAssignment: {
          include: {
            workflow: {
              include: {
                states: true,
                transitions: {
                  include: {
                    conditions: { orderBy: { evalOrder: 'asc' } },
                    hooks: { orderBy: { execOrder: 'asc' } }
                  }
                }
              }
            },
            currentState: true
          }
        }
      }
    });

    if (!task || task.isDeleted) {
      throw new NotFoundError('Task not found');
    }

    if (!task.workflowAssignment) {
      throw new BadRequestError('Task is not assigned to any workflow');
    }

    const { workflow, currentState: fromState } = task.workflowAssignment;

    // 2. Identify target state
    const toState = workflow.states.find((s) =>
      toStateIdentifier.stateId
        ? s.id === toStateIdentifier.stateId
        : s.slug === toStateIdentifier.stateSlug?.toLowerCase()
    );

    if (!toState) {
      throw new NotFoundError('Target workflow state not found in active workflow definition');
    }

    if (fromState.id === toState.id) {
      throw new BadRequestError(`Task is already in state '${fromState.name}'`);
    }

    // 3. Find transition between states
    const transition = workflow.transitions.find(
      (t) => t.fromStateId === fromState.id && t.toStateId === toState.id
    );

    if (!transition) {
      throw new BadRequestError(
        `Invalid workflow transition: No configured path from '${fromState.name}' to '${toState.name}'.`
      );
    }

    // 4. Fetch user details and client membership for guard checking
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: {
          include: { role: true }
        }
      }
    });

    const clientMember = await prisma.clientMember.findUnique({
      where: {
        clientId_userId: {
          clientId: task.clientId,
          userId
        }
      }
    });

    const context: TransitionContext = {
      task,
      user,
      clientMember,
      fromState,
      toState,
      transition
    };

    // 5. Evaluate transition guard conditions
    const evaluation = await this.evaluateConditions(transition.conditions, context);
    if (!evaluation.passed) {
      throw new ForbiddenError(evaluation.failedReason || 'Transition condition check failed');
    }

    // 6. Calculate duration in previous state
    const now = new Date();
    const enteredAt = new Date(task.workflowAssignment.enteredStateAt);
    const durationMs = BigInt(now.getTime() - enteredAt.getTime());

    // 7. Atomic DB Transaction for state update + history record + task status sync
    const mappedStatus = this.mapStateSlugToTaskStatus(toState.slug);

    await prisma.$transaction(async (tx) => {
      // Update workflow assignment state
      await tx.taskWorkflowAssignment.update({
        where: { taskId: task.id },
        data: {
          currentStateId: toState.id,
          enteredStateAt: now
        }
      });

      // Synchronize task status and completion dates
      const taskUpdateData: Record<string, any> = {};
      if (mappedStatus) {
        taskUpdateData.status = mappedStatus;
        if (mappedStatus === TaskStatus.DONE) {
          taskUpdateData.completedAt = now;
        } else if ((task.status as any) === TaskStatus.DONE) {
          taskUpdateData.completedAt = null;
        }
      }

      await tx.task.update({
        where: { id: task.id },
        data: {
          ...taskUpdateData,
          version: { increment: 1 }
        }
      });

      // Insert transition history record
      await tx.workflowTransitionHistory.create({
        data: {
          taskId: task.id,
          transitionId: transition.id,
          fromStateId: fromState.id,
          toStateId: toState.id,
          fromStateName: fromState.name,
          toStateName: toState.name,
          triggeredById: userId,
          comment: comment || null,
          durationInStateMs: durationMs,
          transitionedAt: now
        }
      });
    });

    // 8. Execute side-effect hooks
    await this.executeHooks(transition.hooks, context);

    // 9. Log user activity
    await prisma.userActivityLog.create({
      data: {
        userId,
        activityType: mappedStatus === TaskStatus.DONE ? ActivityType.TASK_COMPLETE : ActivityType.TASK_UPDATE,
        entityType: 'Task',
        entityId: task.id,
        clientId: task.clientId,
        ipAddress: auditContext?.ipAddress,
        metadata: {
          action: 'WORKFLOW_TRANSITION',
          fromState: fromState.name,
          toState: toState.name,
          durationSeconds: Math.round(Number(durationMs) / 1000)
        }
      }
    });

    // 10. Return updated task with workflow assignment
    return prisma.task.findUnique({
      where: { id: task.id },
      include: {
        workflowAssignment: {
          include: {
            currentState: true,
            workflow: {
              select: { id: true, name: true, version: true }
            }
          }
        },
        assignee: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true }
        }
      }
    });
  }
}

export const workflowEngine = new WorkflowEngine();
