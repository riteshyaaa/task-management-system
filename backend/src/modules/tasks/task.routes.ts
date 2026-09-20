import { Router } from 'express';
import { taskController } from './task.controller';
import commentRouter from '../comments/comment.routes';
import { authenticate } from '../../middleware/auth.middleware';
import { requireTeamMember } from '../../middleware/abac-team.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';
import { validate } from '../../middleware/validate.middleware';
import {
  createTaskSchema,
  updateTaskSchema,
  filterTasksQuerySchema,
  reorderTaskSchema,
  taskWatcherSchema
} from './task.schema';

const router = Router();

router.use(authenticate);

// Nested comment routes
router.use('/:taskId/comments', commentRouter);

// Task CRUD
router.post(
  '/',
  requirePermission('tasks:create'),
  requireTeamMember(),
  validate({ body: createTaskSchema }),
  taskController.createTask
);

router.get(
  '/',
  requirePermission('tasks:read'),
  requireTeamMember(),
  validate({ query: filterTasksQuerySchema }),
  taskController.listTasks
);

router.post(
  '/reorder',
  requirePermission('tasks:update'),
  requireTeamMember(),
  validate({ body: reorderTaskSchema }),
  taskController.reorderTask
);

router.get(
  '/:taskId',
  requirePermission('tasks:read'),
  taskController.getTaskById
);

router.put(
  '/:taskId',
  requirePermission('tasks:update'),
  validate({ body: updateTaskSchema }),
  taskController.updateTask
);

router.patch(
  '/:taskId',
  requirePermission('tasks:update'),
  validate({ body: updateTaskSchema }),
  taskController.updateTask
);

router.post(
  '/:taskId/subtasks',
  requirePermission('tasks:create'),
  taskController.addSubtask
);

router.delete(
  '/:taskId',
  requirePermission('tasks:delete'),
  taskController.deleteTask
);

// Watchers
router.post(
  '/:taskId/watchers',
  validate({ body: taskWatcherSchema }),
  taskController.addWatcher
);

router.delete(
  '/:taskId/watchers/:userId',
  taskController.removeWatcher
);

export default router;
