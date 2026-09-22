import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../shared/utils/jwt.util';
import { UnauthorizedError } from '../shared/errors/app-error';
import { prisma } from '../config/database';

export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Authentication required. Missing Bearer token.');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw new UnauthorizedError('Authentication token malformed.');
    }

    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch (err: any) {
      if (err.name === 'TokenExpiredError') {
        throw new UnauthorizedError('Access token has expired. Please refresh your token.', { expired: true });
      }
      throw new UnauthorizedError('Invalid or corrupted access token.');
    }

    // Verify user is still active in database
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true,
        deletedAt: true
      }
    });

    if (!user || !user.isActive || user.deletedAt) {
      throw new UnauthorizedError('User account is inactive or has been disabled.');
    }

    req.user = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      roles: payload.roles,
      permissions: payload.permissions
    };

    if (req.auditContext) {
      req.auditContext.userId = user.id;
    }

    next();
  } catch (error) {
    next(error);
  }
}

export async function optionalAuthenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  try {
    const token = authHeader.split(' ')[1];
    if (token) {
      const payload = verifyAccessToken(token);
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { id: true, email: true, firstName: true, lastName: true, isActive: true }
      });
      if (user && user.isActive) {
        req.user = {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          roles: payload.roles,
          permissions: payload.permissions
        };
        if (req.auditContext) {
          req.auditContext.userId = user.id;
        }
      }
    }
  } catch {
    // Ignore invalid tokens for optional authentication
  }
  next();
}
