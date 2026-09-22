import {
  Prisma,
  RuleTriggerType,
  NotificationType,
  TaskStatus,
  TaskPriority
} from '@prisma/client';
import { prisma } from '../../config/database';
import { logger } from '../../config/logger';
import { RuleCondition, RuleAction, RuleActionType } from './automation.schema';

export class AutomationEngine {
  /**
   * Evaluates if a single condition matches the context object
   */
  private evaluateCondition(condition: RuleCondition, context: Record<string, any>): boolean {
    const fieldValue = context[condition.field];

    switch (condition.operator) {
      case 'EQUALS':
        return fieldValue === condition.value;
      case 'NOT_EQUALS':
        return fieldValue !== condition.value;
      case 'CONTAINS':
        if (typeof fieldValue === 'string') {
          return fieldValue.toLowerCase().includes(String(condition.value).toLowerCase());
        }
        if (Array.isArray(fieldValue)) {
          return fieldValue.includes(condition.value);
        }
        return false;
      case 'GREATER_THAN':
        return Number(fieldValue) > Number(condition.value);
      case 'LESS_THAN':
        return Number(fieldValue) < Number(condition.value);
      case 'IN':
        return Array.isArray(condition.value) && condition.value.includes(fieldValue);
      case 'IS_NULL':
        return fieldValue === null || fieldValue === undefined;
      case 'IS_NOT_NULL':
        return fieldValue !== null && fieldValue !== undefined;
      default:
        return false;
    }
  }

  /**
   * Evaluates if all conditions of a rule match the context
   */
  public evaluateConditions(conditions: RuleCondition[], context: Record<string, any>): boolean {
    if (!conditions || conditions.length === 0) return true;
    return conditions.every((cond) => this.evaluateCondition(cond, context));
  }

  /**
   * Evaluates if trigger config matches the event
   */
  private evaluateTriggerConfig(config: Record<string, any>, eventContext: Record<string, any>): boolean {
    if (!config || Object.keys(config).length === 0) return true;

    for (const [key, expectedValue] of Object.entries(config)) {
      if (eventContext[key] !== undefined && eventContext[key] !== expectedValue) {
        return false;
      }
    }
    return true;
  }

  /**
   * Executes an action against the task and environment
   */
  public async executeAction(action: RuleAction, taskContext: Record<string, any>): Promise<void> {
    const type = action.type;
    const payload = (action.payload || {}) as Record<string, any>;
    const taskId = taskContext.id || taskContext.taskId;

    try {
      switch (type) {
        case RuleActionType.ASSIGN_TASK: {
          if (taskId && payload.userId) {
            await prisma.task.update({
              where: { id: taskId },
              data: { assigneeId: payload.userId }
            });

            await prisma.notification.create({
              data: {
                userId: payload.userId,
                type: NotificationType.TASK_ASSIGNED,
                title: 'Task Assigned by Automation',
                message: `You were assigned to task: ${taskContext.title || taskId}`,
                data: { taskId }
              }
            });
          }
          break;
        }

        case RuleActionType.UPDATE_FIELD: {
          if (taskId && payload.field) {
            const updateData: Record<string, any> = {};
            updateData[payload.field] = payload.value;

            await prisma.task.update({
              where: { id: taskId },
              data: updateData
            });
          }
          break;
        }

        case RuleActionType.SEND_NOTIFICATION: {
          const recipientId = payload.userId || taskContext.assigneeId || taskContext.reporterId;
          if (recipientId) {
            await prisma.notification.create({
              data: {
                userId: recipientId,
                type: NotificationType.SYSTEM_ALERT,
                title: payload.title || 'Automation Notification',
                message: payload.message || 'An automation rule triggered an alert for this task.',
                data: { taskId: taskId || null, ...payload.data }
              }
            });
          }
          break;
        }

        case RuleActionType.CREATE_TASK: {
          const clientId = taskContext.clientId || payload.clientId;
          const reporterId = taskContext.reporterId || payload.reporterId;

          if (clientId && reporterId) {
            await prisma.task.create({
              data: {
                title: payload.title || 'Automated Follow-up Task',
                description: payload.description || null,
                clientId,
                reporterId,
                assigneeId: payload.assigneeId || null,
                parentTaskId: payload.createAsSubtask ? taskId : null,
                status: payload.status || TaskStatus.TODO,
                priority: payload.priority || TaskPriority.MEDIUM
              }
            });
          }
          break;
        }

        case RuleActionType.TRIGGER_WEBHOOK: {
          logger.info(`[AutomationEngine] Webhook simulated trigger to ${payload.url || 'endpoint'}`);
          break;
        }

        default:
          logger.warn(`[AutomationEngine] Unknown action type: ${type}`);
      }
    } catch (err: any) {
      logger.error(`[AutomationEngine] Failed to execute action ${type}: ${err.message}`);
    }
  }

  /**
   * Main entry point when a system event occurs.
   * Finds matching active rules and executes their actions.
   */
  public async handleEvent(
    clientId: string,
    triggerType: RuleTriggerType,
    eventContext: Record<string, any>
  ): Promise<number> {
    try {
      const activeRules = await prisma.automationRule.findMany({
        where: {
          clientId,
          triggerType,
          isActive: true
        }
      });

      let executedCount = 0;

      for (const rule of activeRules) {
        const triggerConfig = (rule.triggerConfig as Record<string, any>) || {};
        const conditions = (rule.conditions as RuleCondition[]) || [];
        const actions = (rule.actions as RuleAction[]) || [];

        // Check trigger config match
        if (!this.evaluateTriggerConfig(triggerConfig, eventContext)) {
          continue;
        }

        // Check conditions match
        if (!this.evaluateConditions(conditions, eventContext)) {
          continue;
        }

        // Execute all actions
        for (const action of actions) {
          await this.executeAction(action, eventContext);
        }

        // Update rule execution telemetry
        await prisma.automationRule.update({
          where: { id: rule.id },
          data: {
            executionCount: { increment: 1 },
            lastTriggeredAt: new Date()
          }
        });

        executedCount++;
      }

      return executedCount;
    } catch (error: any) {
      logger.error(`[AutomationEngine] Event handling error: ${error.message}`);
      return 0;
    }
  }
}

export const automationEngine = new AutomationEngine();
