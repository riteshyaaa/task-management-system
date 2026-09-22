import { Router } from 'express';
import { recurringController } from './recurring.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';
import { validate } from '../../middleware/validate.middleware';
import {
  createRecurrenceRuleSchema,
  updateRecurrenceRuleSchema,
  addExceptionDateSchema,
  filterRecurrenceRulesQuerySchema
} from './recurring.schema';

const router = Router();

router.use(authenticate);

router.post(
  '/',
  requirePermission('tasks:create'),
  validate({ body: createRecurrenceRuleSchema }),
  recurringController.createRecurrenceRule
);

router.get(
  '/',
  requirePermission('tasks:read'),
  validate({ query: filterRecurrenceRulesQuerySchema }),
  recurringController.listRecurrenceRules
);

router.get(
  '/:ruleId',
  requirePermission('tasks:read'),
  recurringController.getRecurrenceRuleById
);

router.patch(
  '/:ruleId',
  requirePermission('tasks:update'),
  validate({ body: updateRecurrenceRuleSchema }),
  recurringController.updateRecurrenceRule
);

router.post(
  '/:ruleId/pause',
  requirePermission('tasks:update'),
  recurringController.pauseRecurrenceRule
);

router.post(
  '/:ruleId/resume',
  requirePermission('tasks:update'),
  recurringController.resumeRecurrenceRule
);

router.delete(
  '/:ruleId',
  requirePermission('tasks:delete'),
  recurringController.cancelRecurrenceRule
);

router.post(
  '/:ruleId/exceptions',
  requirePermission('tasks:update'),
  validate({ body: addExceptionDateSchema }),
  recurringController.addExceptionDate
);

router.delete(
  '/:ruleId/exceptions/:exceptionDate',
  requirePermission('tasks:update'),
  recurringController.removeExceptionDate
);

router.post(
  '/:ruleId/trigger',
  requirePermission('tasks:create'),
  recurringController.triggerManually
);

export default router;
