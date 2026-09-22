import { RuleTriggerType } from '@prisma/client';
import { prisma } from '../../config/database';
import { NotFoundError } from '../../shared/errors/app-error';
import { CreateAutomationRuleInput, UpdateAutomationRuleInput } from './automation.schema';
import { automationEngine } from './automation-engine';

export class AutomationService {
  async createRule(userId: string, input: CreateAutomationRuleInput) {
    const rule = await prisma.automationRule.create({
      data: {
        clientId: input.clientId,
        name: input.name,
        description: input.description,
        triggerType: input.triggerType,
        triggerConfig: input.triggerConfig as any,
        conditions: input.conditions as any,
        actions: input.actions as any,
        isActive: input.isActive !== undefined ? input.isActive : true,
        createdById: userId
      },
      include: {
        createdBy: {
          select: { id: true, firstName: true, lastName: true, email: true }
        }
      }
    });

    return rule;
  }

  async listRules(clientId: string) {
    const rules = await prisma.automationRule.findMany({
      where: { clientId },
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: {
          select: { id: true, firstName: true, lastName: true, email: true }
        }
      }
    });

    return rules;
  }

  async getRuleById(ruleId: string) {
    const rule = await prisma.automationRule.findUnique({
      where: { id: ruleId },
      include: {
        createdBy: {
          select: { id: true, firstName: true, lastName: true, email: true }
        }
      }
    });

    if (!rule) throw new NotFoundError('Automation rule not found');
    return rule;
  }

  async updateRule(ruleId: string, input: UpdateAutomationRuleInput) {
    const rule = await prisma.automationRule.findUnique({
      where: { id: ruleId }
    });

    if (!rule) throw new NotFoundError('Automation rule not found');

    const updated = await prisma.automationRule.update({
      where: { id: ruleId },
      data: {
        name: input.name,
        description: input.description,
        triggerType: input.triggerType,
        triggerConfig: input.triggerConfig ? (input.triggerConfig as any) : undefined,
        conditions: input.conditions ? (input.conditions as any) : undefined,
        actions: input.actions ? (input.actions as any) : undefined,
        isActive: input.isActive
      },
      include: {
        createdBy: {
          select: { id: true, firstName: true, lastName: true, email: true }
        }
      }
    });

    return updated;
  }

  async deleteRule(ruleId: string) {
    const rule = await prisma.automationRule.findUnique({
      where: { id: ruleId }
    });

    if (!rule) throw new NotFoundError('Automation rule not found');

    await prisma.automationRule.delete({
      where: { id: ruleId }
    });

    return { message: 'Automation rule deleted successfully' };
  }

  async testTriggerRule(ruleId: string, context: Record<string, any>) {
    const rule = await prisma.automationRule.findUnique({
      where: { id: ruleId }
    });

    if (!rule) throw new NotFoundError('Automation rule not found');

    const conditionsMatched = automationEngine.evaluateConditions(
      (rule.conditions as any) || [],
      context
    );

    if (!conditionsMatched) {
      return {
        executed: false,
        reason: 'Rule conditions did not evaluate to true for the provided test context',
        conditions: rule.conditions
      };
    }

    const actions = (rule.actions as any[]) || [];
    for (const action of actions) {
      await automationEngine.executeAction(action, context);
    }

    await prisma.automationRule.update({
      where: { id: rule.id },
      data: {
        executionCount: { increment: 1 },
        lastTriggeredAt: new Date()
      }
    });

    return {
      executed: true,
      actionsCount: actions.length,
      message: 'Automation rule executed successfully for test context'
    };
  }
}

export const automationService = new AutomationService();
