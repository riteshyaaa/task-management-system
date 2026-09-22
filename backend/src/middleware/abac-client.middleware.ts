import { Request, Response, NextFunction } from 'express';
import { ClientRole, RoleName } from '@prisma/client';
import { ForbiddenError, NotFoundError, UnauthorizedError } from '../shared/errors/app-error';
import { prisma } from '../config/database';

/**
 * Ensures the authenticated user is an active member of the client specified in req.params.clientId,
 * req.body.clientId, req.query.clientId, or the X-Client-Id header.
 */
export function requireClientMember(allowedRoles?: ClientRole[]) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required.');
      }

      // Resolve clientId from various possible request locations
      const clientId =
        req.params.clientId ||
        req.body.clientId ||
        (req.query.clientId as string) ||
        (req.headers['X-Client-Id'] as string);

      if (!clientId) {
        throw new ForbiddenError('client context (clientId) is required for this operation.');
      }

      // Admins bypass client membership checks
      if (req.user.roles.includes(RoleName.ADMIN)) {
        req.clientMembership = {
          clientId,
          role: ClientRole.OWNER
        };
        return next();
      }

      const membership = await prisma.clientMember.findUnique({
        where: {
          clientId_userId: {
            clientId,
            userId: req.user.id
          }
        },
        include: {
          client: {
            select: { id: true, isArchived: true }
          }
        }
      });

      if (!membership) {
        throw new ForbiddenError('You are not a member of this workspace client.');
      }

      if (membership.client.isArchived) {
        throw new ForbiddenError('This client workspace is archived.');
      }

      if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(membership.role)) {
        throw new ForbiddenError(
          `Insufficient client privileges. Requires one of: [${allowedRoles.join(', ')}]. Current role: ${membership.role}`
        );
      }

      req.clientMembership = {
        clientId: membership.clientId,
        role: membership.role
      };

      next();
    } catch (error) {
      next(error);
    }
  };
}
