import { Router } from 'express';
import { clientController } from './client.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireClientMember } from '../../middleware/abac-client.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';
import { validate } from '../../middleware/validate.middleware';
import {
  createClientSchema,
  updateClientSchema,
  addClientMemberSchema,
  updateClientMemberSchema
} from './client.schema';
import { ClientRole } from '@prisma/client';

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

// Client Membership Management
router.get(
  '/:clientId/members',
  requireClientMember(),
  clientController.getClientMembers
);

router.post(
  '/:clientId/members',
  requireClientMember([ClientRole.OWNER, ClientRole.MAINTAINER]),
  validate({ body: addClientMemberSchema }),
  clientController.addMember
);

router.patch(
  '/:clientId/members/:userId',
  requireClientMember([ClientRole.OWNER]),
  validate({ body: updateClientMemberSchema }),
  clientController.updateMemberRole
);

router.delete(
  '/:clientId/members/:userId',
  requireClientMember([ClientRole.OWNER, ClientRole.MAINTAINER]),
  clientController.removeMember
);

export default router;
