import { Router } from 'express';
import { workflowController } from './workflow.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';
import { validate } from '../../middleware/validate.middleware';
import {
  createWorkflowDefinitionSchema,
  updateWorkflowDefinitionSchema,
  assignWorkflowSchema,
  transitionTaskSchema
} from './workflow.schema';

const router = Router();

router.use(authenticate);

// Workflow definitions CRUD
router.post(
  '/',
  requirePermission('workflows:create'),
  validate({ body: createWorkflowDefinitionSchema }),
  workflowController.createWorkflow
);

router.get(
  '/',
  requirePermission('workflows:read'),
  workflowController.listWorkflows
);

router.get(
  '/:workflowId',
  requirePermission('workflows:read'),
  workflowController.getWorkflowById
);

router.patch(
  '/:workflowId',
  requirePermission('workflows:update'),
  validate({ body: updateWorkflowDefinitionSchema }),
  workflowController.updateWorkflow
);

// Task workflow execution routes
router.post(
  '/tasks/:taskId/assign',
  requirePermission('tasks:update'),
  validate({ body: assignWorkflowSchema }),
  workflowController.assignWorkflowToTask
);

router.get(
  '/tasks/:taskId/state',
  requirePermission('tasks:read'),
  workflowController.getTaskWorkflowState
);

router.post(
  '/tasks/:taskId/transition',
  requirePermission('tasks:update'),
  validate({ body: transitionTaskSchema }),
  workflowController.transitionTask
);

export default router;
