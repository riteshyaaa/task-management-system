import { Router } from 'express';
import { labelController } from './label.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';
import { validate } from '../../middleware/validate.middleware';
import { createLabelSchema, updateLabelSchema } from './label.schema';

const router = Router();

router.use(authenticate);

router.post(
  '/',
  requirePermission('tasks:create'),
  validate({ body: createLabelSchema }),
  labelController.createLabel
);

router.get(
  '/',
  requirePermission('tasks:read'),
  labelController.listLabels
);

router.patch(
  '/:labelId',
  requirePermission('tasks:update'),
  validate({ body: updateLabelSchema }),
  labelController.updateLabel
);

router.delete(
  '/:labelId',
  requirePermission('tasks:delete'),
  labelController.deleteLabel
);

export default router;
