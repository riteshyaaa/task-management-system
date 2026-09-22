import { Router } from 'express';
import { userController } from './user.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requirePermission, requireRole } from '../../middleware/rbac.middleware';
import { validate } from '../../middleware/validate.middleware';
import { listUsersSchema, updateUserSchema, assignRolesSchema } from './user.schema';
import { RoleName } from '@prisma/client';

const router = Router();

router.use(authenticate);

router.get(
  '/',
  requirePermission('users:read'),
  validate({ query: listUsersSchema }),
  userController.listUsers
);

router.get(
  '/:id',
  requirePermission('users:read'),
  userController.getUserById
);

router.patch(
  '/:id',
  requirePermission('users:write'),
  validate({ body: updateUserSchema }),
  userController.updateUser
);

router.post(
  '/:id/roles',
  requireRole(RoleName.ADMIN),
  validate({ body: assignRolesSchema }),
  userController.assignRoles
);

router.delete(
  '/:id',
  requireRole(RoleName.ADMIN),
  userController.deleteUser
);

export default router;
