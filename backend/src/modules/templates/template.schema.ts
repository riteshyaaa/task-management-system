import { z } from 'zod';
import { TaskPriority } from '@prisma/client';

export const templateItemSchema = z.object({
  title: z.string().min(1, 'Item title is required').max(255),
  description: z.string().optional().nullable(),
  position: z.number().int().min(0).default(0),
  estimatedHours: z.number().min(0).max(9999).optional().nullable()
});

export const createTemplateSchema = z.object({
  clientId: z.string().uuid('Invalid client ID'),
  name: z.string().min(1, 'Template name is required').max(128).trim(),
  description: z.string().optional().nullable(),
  defaultTitle: z.string().min(1, 'Default title is required').max(255).trim(),
  defaultBody: z.string().optional().nullable(),
  defaultPriority: z.nativeEnum(TaskPriority).default(TaskPriority.MEDIUM),
  estimatedHours: z.number().min(0).max(9999).optional().nullable(),
  variables: z.array(z.string()).default([]), // List of allowed variable names e.g. ["clientName", "sprintNumber"]
  items: z.array(templateItemSchema).optional().default([])
});

export const updateTemplateSchema = z.object({
  name: z.string().min(1).max(128).trim().optional(),
  description: z.string().optional().nullable(),
  defaultTitle: z.string().min(1).max(255).trim().optional(),
  defaultBody: z.string().optional().nullable(),
  defaultPriority: z.nativeEnum(TaskPriority).optional(),
  estimatedHours: z.number().min(0).max(9999).optional().nullable(),
  variables: z.array(z.string()).optional(),
  items: z.array(templateItemSchema).optional()
});

export const instantiateTemplateSchema = z.object({
  variables: z.record(z.string(), z.any()).optional().default({}),
  assigneeId: z.string().uuid().optional().nullable(),
  dueDate: z.string().datetime().optional().nullable(),
  startDate: z.string().datetime().optional().nullable(),
  priority: z.nativeEnum(TaskPriority).optional()
});

export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;
export type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>;
export type InstantiateTemplateInput = z.infer<typeof instantiateTemplateSchema>;
