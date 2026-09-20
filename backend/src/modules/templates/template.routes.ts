import { Router } from 'express';
import { templateController } from './template.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';
import { validate } from '../../middleware/validate.middleware';
import {
  createTemplateSchema,
  updateTemplateSchema,
  instantiateTemplateSchema
} from './template.schema';

const router = Router();

router.use(authenticate);

router.post(
  '/',
  requirePermission('templates:create'),
  validate({ body: createTemplateSchema }),
  templateController.createTemplate
);

router.get(
  '/',
  requirePermission('templates:read'),
  templateController.listTemplates
);

router.get(
  '/:templateId',
  requirePermission('templates:read'),
  templateController.getTemplateById
);

router.patch(
  '/:templateId',
  requirePermission('templates:update'),
  validate({ body: updateTemplateSchema }),
  templateController.updateTemplate
);

router.delete(
  '/:templateId',
  requirePermission('templates:delete'),
  templateController.deleteTemplate
);

router.post(
  '/:templateId/instantiate',
  requirePermission('tasks:create'),
  validate({ body: instantiateTemplateSchema }),
  templateController.instantiateTemplate
);

export default router;
