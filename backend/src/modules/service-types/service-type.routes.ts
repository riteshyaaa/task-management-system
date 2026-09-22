import { Router } from 'express';
import { serviceTypeController } from './service-type.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/rbac.middleware';
import { validate } from '../../middleware/validate.middleware';
import {
  createServiceTypeSchema,
  updateServiceTypeSchema,
  filterServiceTypesQuerySchema
} from './service-type.schema';
import { RoleName } from '@prisma/client';

const router = Router();

router.use(authenticate);

router.get(
  '/',
  validate({ query: filterServiceTypesQuerySchema }),
  serviceTypeController.listServiceTypes
);

router.get(
  '/:id',
  serviceTypeController.getServiceTypeById
);

router.post(
  '/',
  requireRole(RoleName.ADMIN, RoleName.MANAGER),
  validate({ body: createServiceTypeSchema }),
  serviceTypeController.createServiceType
);

router.patch(
  '/:id',
  requireRole(RoleName.ADMIN, RoleName.MANAGER),
  validate({ body: updateServiceTypeSchema }),
  serviceTypeController.updateServiceType
);

router.delete(
  '/:id',
  requireRole(RoleName.ADMIN),
  serviceTypeController.deleteServiceType
);

export default router;
