import { Router } from 'express';
import { automationController } from './automation.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';
import { validate } from '../../middleware/validate.middleware';
import {
  createAutomationRuleSchema,
  updateAutomationRuleSchema
} from './automation.schema';

const router = Router();

router.use(authenticate);

router.post(
  '/',
  requirePermission('workflows:create'),
  validate({ body: createAutomationRuleSchema }),
  automationController.createRule
);

router.get(
  '/',
  requirePermission('workflows:read'),
  automationController.listRules
);

router.get(
  '/:ruleId',
  requirePermission('workflows:read'),
  automationController.getRuleById
);

router.patch(
  '/:ruleId',
  requirePermission('workflows:update'),
  validate({ body: updateAutomationRuleSchema }),
  automationController.updateRule
);

router.delete(
  '/:ruleId',
  requirePermission('workflows:delete'),
  automationController.deleteRule
);

router.post(
  '/:ruleId/test',
  requirePermission('workflows:update'),
  automationController.testTriggerRule
);

export default router;
