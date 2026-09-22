import { Request, Response, NextFunction } from 'express';
import { RoleName } from '@prisma/client';
import { ForbiddenError, UnauthorizedError } from '../shared/errors/app-error';

/**
 * Ensures the authenticated user possesses at least one of the specified system roles.
 */
export function requireRole(...allowedRoles: RoleName[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required before checking roles.'));
    }

    const hasRole = req.user.roles.some(role => allowedRoles.includes(role));
    if (!hasRole) {
      return next(
        new ForbiddenError(`Access denied. Requires one of the following roles: [${allowedRoles.join(', ')}]`)
      );
    }

    next();
  };
}

/**
 * Ensures the authenticated user possesses all specified permission slugs.
 * ADMIN role automatically bypasses granular permission checks.
 */
export function requirePermission(...requiredPermissions: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required before checking permissions.'));
    }

    // System Admins have full access
    if (req.user.roles.includes(RoleName.ADMIN)) {
      return next();
    }

    const hasAllPermissions = requiredPermissions.every(perm => req.user?.permissions.includes(perm));

    if (!hasAllPermissions) {
      const missing = requiredPermissions.filter(perm => !req.user?.permissions.includes(perm));
      return next(
        new ForbiddenError(`Access denied. Missing required permissions: [${missing.join(', ')}]`, {
          missingPermissions: missing
        })
      );
    }

    next();
  };
}
