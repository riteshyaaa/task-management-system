import { Router } from 'express';
import { teamController } from './team.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireTeamMember } from '../../middleware/abac-team.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';
import { validate } from '../../middleware/validate.middleware';
import {
  createTeamSchema,
  updateTeamSchema,
  addTeamMemberSchema,
  updateTeamMemberSchema
} from './team.schema';
import { TeamRole } from '@prisma/client';

const router = Router();

router.use(authenticate);

// Team workspace CRUD
router.post(
  '/',
  requirePermission('teams:create'),
  validate({ body: createTeamSchema }),
  teamController.createTeam
);

router.get(
  '/',
  teamController.listUserTeams
);

router.get(
  '/:teamId',
  requireTeamMember(),
  teamController.getTeamById
);

router.patch(
  '/:teamId',
  requireTeamMember([TeamRole.OWNER, TeamRole.MAINTAINER]),
  validate({ body: updateTeamSchema }),
  teamController.updateTeam
);

router.delete(
  '/:teamId',
  requireTeamMember([TeamRole.OWNER]),
  teamController.archiveTeam
);

// Team Membership Management
router.get(
  '/:teamId/members',
  requireTeamMember(),
  teamController.getTeamMembers
);

router.post(
  '/:teamId/members',
  requireTeamMember([TeamRole.OWNER, TeamRole.MAINTAINER]),
  validate({ body: addTeamMemberSchema }),
  teamController.addMember
);

router.patch(
  '/:teamId/members/:userId',
  requireTeamMember([TeamRole.OWNER]),
  validate({ body: updateTeamMemberSchema }),
  teamController.updateMemberRole
);

router.delete(
  '/:teamId/members/:userId',
  requireTeamMember([TeamRole.OWNER, TeamRole.MAINTAINER]),
  teamController.removeMember
);

export default router;
