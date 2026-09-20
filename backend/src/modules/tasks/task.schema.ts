import { z } from 'zod';
import { TaskStatus, TaskPriority } from '@prisma/client';

export const createTaskSchema = z.object({
  title: z.string().min(1, 'Task title is required').max(255).trim(),
  description: z.string().optional(),
  teamId: z.string().uuid('Invalid team ID'),
  status: z.nativeEnum(TaskStatus).default(TaskStatus.TODO),
  priority: z.nativeEnum(TaskPriority).default(TaskPriority.MEDIUM),
  dueDate: z.string().datetime().optional().nullable(),
  startDate: z.string().datetime().optional().nullable(),
  estimatedHours: z.number().min(0).max(9999).optional().nullable(),
  assigneeId: z.string().uuid('Invalid assignee ID').optional().nullable(),
  parentTaskId: z.string().uuid('Invalid parent task ID').optional().nullable(),
  labelIds: z.array(z.string().uuid('Invalid label ID')).optional().default([]),
  templateId: z.string().uuid().optional().nullable(),
  metadata: z.record(z.any()).optional().default({})
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(255).trim().optional(),
  description: z.string().optional().nullable(),
  status: z.nativeEnum(TaskStatus).optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  dueDate: z.string().datetime().optional().nullable(),
  startDate: z.string().datetime().optional().nullable(),
  completedAt: z.string().datetime().optional().nullable(),
  estimatedHours: z.number().min(0).max(9999).optional().nullable(),
  actualHours: z.number().min(0).max(9999).optional().nullable(),
  assigneeId: z.string().uuid('Invalid assignee ID').optional().nullable(),
  parentTaskId: z.string().uuid('Invalid parent task ID').optional().nullable(),
  position: z.number().int().optional(),
  labelIds: z.array(z.string().uuid()).optional(),
  version: z.number().int().optional(), // Optimistic locking
  metadata: z.record(z.any()).optional()
});

export const filterTasksQuerySchema = z.object({
  teamId: z.string().uuid('Invalid team ID').optional(),
  status: z.union([z.nativeEnum(TaskStatus), z.array(z.nativeEnum(TaskStatus))]).optional(),
  priority: z.union([z.nativeEnum(TaskPriority), z.array(z.nativeEnum(TaskPriority))]).optional(),
  assigneeId: z.string().uuid().optional().nullable(),
  reporterId: z.string().uuid().optional(),
  labelId: z.string().uuid().optional(),
  parentTaskId: z.string().uuid().optional().nullable(),
  isSubtask: z.enum(['true', 'false']).optional(),
  search: z.string().optional(),
  dueDateFrom: z.string().datetime().optional(),
  dueDateTo: z.string().datetime().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  sortBy: z.enum(['createdAt', 'dueDate', 'priority', 'position', 'taskNumber']).default('position'),
  sortOrder: z.enum(['asc', 'desc']).default('asc')
});

export const reorderTaskSchema = z.object({
  taskId: z.string().uuid('Invalid task ID'),
  targetPosition: z.number().int().min(0),
  targetStatus: z.nativeEnum(TaskStatus).optional()
});

export const taskWatcherSchema = z.object({
  userId: z.string().uuid('Invalid user ID')
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type FilterTasksQuery = z.infer<typeof filterTasksQuerySchema>;
export type ReorderTaskInput = z.infer<typeof reorderTaskSchema>;
