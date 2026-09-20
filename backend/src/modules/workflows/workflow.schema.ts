import { z } from 'zod';
import {
  WorkflowStatus,
  TransitionConditionType,
  HookEventType
} from '@prisma/client';

export const createWorkflowStateSchema = z.object({
  name: z.string().min(1).max(64).trim(),
  slug: z.string().min(1).max(64).trim().toLowerCase().regex(/^[a-z0-9-_]+$/, 'Slug must be alphanumeric with hyphens or underscores'),
  color: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/).optional().nullable(),
  isInitial: z.boolean().default(false),
  isTerminal: z.boolean().default(false),
  position: z.number().int().min(0).default(0)
});

export const transitionConditionSchema = z.object({
  conditionType: z.nativeEnum(TransitionConditionType),
  config: z.record(z.string(), z.any()).default({}),
  errorMessage: z.string().max(255).optional().nullable(),
  evalOrder: z.number().int().default(0)
});

export const transitionHookSchema = z.object({
  hookType: z.nativeEnum(HookEventType),
  config: z.record(z.string(), z.any()).default({}),
  isAsync: z.boolean().default(true),
  execOrder: z.number().int().default(0),
  isActive: z.boolean().default(true)
});

export const createWorkflowTransitionSchema = z.object({
  fromStateSlug: z.string().min(1),
  toStateSlug: z.string().min(1),
  name: z.string().max(128).optional().nullable(),
  isAutomatic: z.boolean().default(false),
  conditions: z.array(transitionConditionSchema).optional().default([]),
  hooks: z.array(transitionHookSchema).optional().default([])
});

export const createWorkflowDefinitionSchema = z.object({
  teamId: z.string().uuid('Invalid team ID'),
  name: z.string().min(1).max(128).trim(),
  description: z.string().optional().nullable(),
  states: z.array(createWorkflowStateSchema).min(2, 'A workflow must have at least 2 states (e.g. Initial and Terminal)'),
  transitions: z.array(createWorkflowTransitionSchema).min(1, 'A workflow must have at least 1 transition')
});

export const updateWorkflowDefinitionSchema = z.object({
  name: z.string().min(1).max(128).trim().optional(),
  description: z.string().optional().nullable(),
  status: z.nativeEnum(WorkflowStatus).optional()
});

export const assignWorkflowSchema = z.object({
  workflowId: z.string().uuid('Invalid workflow ID')
});

export const transitionTaskSchema = z.object({
  toStateId: z.string().uuid('Invalid target state ID').optional(),
  toStateSlug: z.string().optional(),
  comment: z.string().max(1000).optional()
}).refine(data => data.toStateId || data.toStateSlug, {
  message: 'Either toStateId or toStateSlug must be provided'
});

export type CreateWorkflowStateInput = z.infer<typeof createWorkflowStateSchema>;
export type CreateWorkflowTransitionInput = z.infer<typeof createWorkflowTransitionSchema>;
export type CreateWorkflowDefinitionInput = z.infer<typeof createWorkflowDefinitionSchema>;
export type UpdateWorkflowDefinitionInput = z.infer<typeof updateWorkflowDefinitionSchema>;
export type AssignWorkflowInput = z.infer<typeof assignWorkflowSchema>;
export type TransitionTaskInput = z.infer<typeof transitionTaskSchema>;
