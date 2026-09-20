import { Request, Response, NextFunction } from 'express';
import { TeamRole, RoleName } from '@prisma/client';
import { ForbiddenError, NotFoundError, UnauthorizedError } from '../shared/errors/app-error';
import { prisma } from '../config/database';

/**
 * Ensures the authenticated user is an active member of the team specified in req.params.teamId,
 * req.body.teamId, req.query.teamId, or the X-Team-Id header.
 */
export function requireTeamMember(allowedRoles?: TeamRole[]) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required.');
      }

      // Resolve teamId from various possible request locations
      const teamId =
        req.params.teamId ||
        req.body.teamId ||
        (req.query.teamId as string) ||
        (req.headers['x-team-id'] as string);

      if (!teamId) {
        throw new ForbiddenError('Team context (teamId) is required for this operation.');
      }

      // Admins bypass team membership checks
      if (req.user.roles.includes(RoleName.ADMIN)) {
        req.teamMembership = {
          teamId,
          role: TeamRole.OWNER
        };
        return next();
      }

      const membership = await prisma.teamMember.findUnique({
        where: {
          teamId_userId: {
            teamId,
            userId: req.user.id
          }
        },
        include: {
          team: {
            select: { id: true, isArchived: true }
          }
        }
      });

      if (!membership) {
        throw new ForbiddenError('You are not a member of this workspace team.');
      }

      if (membership.team.isArchived) {
        throw new ForbiddenError('This team workspace is archived.');
      }

      if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(membership.role)) {
        throw new ForbiddenError(
          `Insufficient team privileges. Requires one of: [${allowedRoles.join(', ')}]. Current role: ${membership.role}`
        );
      }

      req.teamMembership = {
        teamId: membership.teamId,
        role: membership.role
      };

      next();
    } catch (error) {
      next(error);
    }
  };
}
