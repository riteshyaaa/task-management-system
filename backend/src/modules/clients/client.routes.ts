import { Router } from 'express';
import { clientController } from './client.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireClientMember } from '../../middleware/abac-client.middleware';
import { requirePermission, requireRole } from '../../middleware/rbac.middleware';
import { validate } from '../../middleware/validate.middleware';
import {
  createClientSchema,
  updateClientSchema,
  addClientMemberSchema,
  updateClientMemberSchema
} from './client.schema';
import { ClientRole, RoleName } from '@prisma/client';

const router = Router();

router.use(authenticate);

// Client workspace CRUD
router.post(
  '/',
  requirePermission('clients:create'),
  validate({ body: createClientSchema }),
  clientController.createClient
);

router.get(
  '/',
  clientController.listUserClients
);

router.get(
  '/:clientId',
  requireClientMember(),
  clientController.getClientById
);

router.patch(
  '/:clientId',
  requireClientMember([ClientRole.OWNER, ClientRole.MAINTAINER]),
  validate({ body: updateClientSchema }),
  clientController.updateClient
);

router.delete(
  '/:clientId',
  requireClientMember([ClientRole.OWNER]),
  clientController.archiveClient
);

// Client Membership Management (Strictly ADMIN only for mutations)
router.get(
  '/:clientId/members',
  requireClientMember(),
  clientController.getClientMembers
);

router.post(
  '/:clientId/members',
  requireRole(RoleName.ADMIN),
  validate({ body: addClientMemberSchema }),
  clientController.addMember
);

router.patch(
  '/:clientId/members/:userId',
  requireRole(RoleName.ADMIN),
  validate({ body: updateClientMemberSchema }),
  clientController.updateMemberRole
);

router.delete(
  '/:clientId/members/:userId',
  requireRole(RoleName.ADMIN),
  clientController.removeMember
);

export default router;
