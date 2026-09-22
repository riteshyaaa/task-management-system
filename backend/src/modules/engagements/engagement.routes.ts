import { Router } from 'express';
import { engagementController } from './engagement.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/rbac.middleware';
import { validate } from '../../middleware/validate.middleware';
import {
  createEngagementSchema,
  updateEngagementSchema,
  filterEngagementsQuerySchema
} from './engagement.schema';
import { RoleName } from '@prisma/client';

const router = Router();

router.use(authenticate);

router.get(
  '/',
  validate({ query: filterEngagementsQuerySchema }),
  engagementController.listEngagements
);

router.get(
  '/:id',
  engagementController.getEngagementById
);

router.post(
  '/',
  requireRole(RoleName.ADMIN, RoleName.MANAGER),
  validate({ body: createEngagementSchema }),
  engagementController.createEngagement
);

router.patch(
  '/:id',
  requireRole(RoleName.ADMIN, RoleName.MANAGER),
  validate({ body: updateEngagementSchema }),
  engagementController.updateEngagement
);

router.delete(
  '/:id',
  requireRole(RoleName.ADMIN, RoleName.MANAGER),
  engagementController.deleteEngagement
);

export default router;
