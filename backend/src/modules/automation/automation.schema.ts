import { z } from 'zod';
import { RuleTriggerType } from '@prisma/client';

export enum RuleActionType {
  CREATE_TASK = 'CREATE_TASK',
  ASSIGN_TASK = 'ASSIGN_TASK',
  UPDATE_FIELD = 'UPDATE_FIELD',
  SEND_NOTIFICATION = 'SEND_NOTIFICATION',
  TRIGGER_WEBHOOK = 'TRIGGER_WEBHOOK'
}

export const ruleConditionSchema = z.object({
  field: z.string().min(1),
  operator: z.enum(['EQUALS', 'NOT_EQUALS', 'CONTAINS', 'GREATER_THAN', 'LESS_THAN', 'IN', 'IS_NULL', 'IS_NOT_NULL']),
  value: z.any().optional()
});

export const ruleActionSchema = z.object({
  type: z.nativeEnum(RuleActionType),
  payload: z.record(z.string(), z.any())
});

export const createAutomationRuleSchema = z.object({
  teamId: z.string().uuid('Invalid team ID'),
  name: z.string().min(1, 'Rule name is required').max(128).trim(),
  description: z.string().optional().nullable(),
  triggerType: z.nativeEnum(RuleTriggerType),
  triggerConfig: z.record(z.string(), z.any()).optional().default({}),
  conditions: z.array(ruleConditionSchema).optional().default([]),
  actions: z.array(ruleActionSchema).min(1, 'At least one action is required'),
  isActive: z.boolean().optional().default(true)
});

export const updateAutomationRuleSchema = z.object({
  name: z.string().min(1).max(128).trim().optional(),
  description: z.string().optional().nullable(),
  triggerType: z.nativeEnum(RuleTriggerType).optional(),
  triggerConfig: z.record(z.string(), z.any()).optional(),
  conditions: z.array(ruleConditionSchema).optional(),
  actions: z.array(ruleActionSchema).min(1).optional(),
  isActive: z.boolean().optional()
});

export type RuleCondition = z.infer<typeof ruleConditionSchema>;
export type RuleAction = z.infer<typeof ruleActionSchema>;
export type CreateAutomationRuleInput = z.infer<typeof createAutomationRuleSchema>;
export type UpdateAutomationRuleInput = z.infer<typeof updateAutomationRuleSchema>;
