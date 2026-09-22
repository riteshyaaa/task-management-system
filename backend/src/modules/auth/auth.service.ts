import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { RoleName, ActivityType } from '@prisma/client';
import { prisma } from '../../config/database';
import { ENV } from '../../config/env.config';
import { logger } from '../../config/logger';
import { hashPassword, comparePassword } from '../../shared/utils/password.util';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../../shared/utils/jwt.util';
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
  UnauthorizedError
} from '../../shared/errors/app-error';
import { RegisterInput, LoginInput, ResetPasswordInput } from './auth.schema';
import { AuditContext } from '../../shared/types/express';

export class AuthService {
  /**
   * Helper to fetch full user roles and permissions
   */
  private async getUserAuthDetails(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!user) throw new NotFoundError('User not found');

    const roles: RoleName[] = user.userRoles.map(ur => ur.role.name);
    const permissionSlugs = new Set<string>();

    for (const ur of user.userRoles) {
      for (const rp of ur.role.permissions) {
        permissionSlugs.add(rp.permission.slug);
      }
    }

    return {
      user,
      roles,
      permissions: Array.from(permissionSlugs)
    };
  }

  /**
   * Register a new user
   */
  async register(input: RegisterInput, auditContext?: AuditContext) {
    const existing = await prisma.user.findUnique({
      where: { email: input.email }
    });

    if (existing) {
      throw new ConflictError('An account with this email address already exists.', undefined, 'EMAIL_EXISTS');
    }

    const memberRole = await prisma.role.findUnique({
      where: { name: RoleName.MEMBER }
    });

    if (!memberRole) {
      throw new Error('Default MEMBER role is missing in database. Please run seed script.');
    }

    const passwordHash = await hashPassword(input.password);

    const user = await prisma.user.create({
      data: {
        email: input.email,
        passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
        avatarUrl: input.avatarUrl,
        userRoles: {
          create: {
            roleId: memberRole.id
          }
        },
        loginStreak: {
          create: {
            currentStreak: 1,
            longestStreak: 1,
            totalActiveDays: 1,
            lastActiveDate: new Date()
          }
        }
      }
    });

    // Log Activity
    await prisma.userActivityLog.create({
      data: {
        userId: user.id,
        activityType: ActivityType.LOGIN,
        entityType: 'User',
        entityId: user.id,
        ipAddress: auditContext?.ipAddress,
        metadata: { userAgent: auditContext?.userAgent || 'unknown' }
      }
    });

    const authDetails = await this.getUserAuthDetails(user.id);

    // Issue initial tokens
    const familyId = uuidv4();
    const tokenRecord = await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: '', // temporary, updated below
        familyId,
        expiresAt: new Date(Date.now() + ENV.JWT_REFRESH_EXPIRATION_DAYS * 24 * 60 * 60 * 1000)
      }
    });

    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      roles: authDetails.roles,
      permissions: authDetails.permissions
    });

    const refreshToken = generateRefreshToken({
      userId: user.id,
      tokenId: tokenRecord.id,
      family: familyId
    });

    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    await prisma.refreshToken.update({
      where: { id: tokenRecord.id },
      data: { tokenHash }
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        avatarUrl: user.avatarUrl,
        roles: authDetails.roles,
        permissions: authDetails.permissions
      },
      tokens: {
        accessToken,
        refreshToken,
        tokenType: 'Bearer',
        expiresIn: ENV.JWT_ACCESS_EXPIRATION
      }
    };
  }

  /**
   * Login with email and password, update daily streak
   */
  async login(input: LoginInput, auditContext?: AuditContext) {
    const user = await prisma.user.findUnique({
      where: { email: input.email }
    });

    if (!user || user.deletedAt) {
      throw new UnauthorizedError('Invalid email or password.', undefined, 'INVALID_CREDENTIALS');
    }

    if (!user.isActive) {
      throw new UnauthorizedError('Your account has been deactivated. Please contact an administrator.', undefined, 'ACCOUNT_DEACTIVATED');
    }

    const isValidPassword = await comparePassword(input.password, user.passwordHash);
    if (!isValidPassword) {
      throw new UnauthorizedError('Invalid email or password.', undefined, 'INVALID_CREDENTIALS');
    }

    // Update daily login streak
    await this.updateUserLoginStreak(user.id);

    const authDetails = await this.getUserAuthDetails(user.id);

    // Generate token family
    const familyId = uuidv4();
    const tokenRecord = await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: '',
        familyId,
        expiresAt: new Date(Date.now() + ENV.JWT_REFRESH_EXPIRATION_DAYS * 24 * 60 * 60 * 1000)
      }
    });

    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      roles: authDetails.roles,
      permissions: authDetails.permissions
    });

    const refreshToken = generateRefreshToken({
      userId: user.id,
      tokenId: tokenRecord.id,
      family: familyId
    });

    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    await prisma.refreshToken.update({
      where: { id: tokenRecord.id },
      data: { tokenHash }
    });

    // Log Activity
    await prisma.userActivityLog.create({
      data: {
        userId: user.id,
        activityType: ActivityType.LOGIN,
        entityType: 'User',
        entityId: user.id,
        ipAddress: auditContext?.ipAddress,
        metadata: { userAgent: auditContext?.userAgent || 'unknown' }
      }
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        avatarUrl: user.avatarUrl,
        roles: authDetails.roles,
        permissions: authDetails.permissions
      },
      tokens: {
        accessToken,
        refreshToken,
        tokenType: 'Bearer',
        expiresIn: ENV.JWT_ACCESS_EXPIRATION
      }
    };
  }

  /**
   * Refresh access and refresh tokens with token family reuse detection
   */
  async refreshToken(rawRefreshToken: string) {
    let payload;
    try {
      payload = verifyRefreshToken(rawRefreshToken);
    } catch {
      throw new UnauthorizedError('Invalid or expired refresh token.');
    }

    const tokenRecord = await prisma.refreshToken.findUnique({
      where: { id: payload.tokenId }
    });

    if (!tokenRecord) {
      throw new UnauthorizedError('Refresh token record not found.');
    }

    // REUSE DETECTION: If this token was already revoked, someone may have compromised the family!
    if (tokenRecord.isRevoked) {
      logger.warn(`[SECURITY ALERT] REUSE DETECTION TRIGGERED: Revoked token reused for user ${payload.userId}, family ${payload.family}. Invalidating family.`);
      await prisma.refreshToken.updateMany({
        where: { familyId: payload.family },
        data: { isRevoked: true }
      });
      throw new UnauthorizedError('Refresh token was already used. Token reuse detected. All active sessions in this family have been terminated for security.', undefined, 'TOKEN_REUSE_DETECTED');
    }

    if (new Date() > tokenRecord.expiresAt) {
      throw new UnauthorizedError('Refresh token has expired. Please log in again.');
    }

    // Revoke old token and create new rotated token in the same family
    await prisma.refreshToken.update({
      where: { id: tokenRecord.id },
      data: { isRevoked: true }
    });

    const authDetails = await this.getUserAuthDetails(payload.userId);

    const newTokenRecord = await prisma.refreshToken.create({
      data: {
        userId: payload.userId,
        tokenHash: '',
        familyId: payload.family,
        expiresAt: new Date(Date.now() + ENV.JWT_REFRESH_EXPIRATION_DAYS * 24 * 60 * 60 * 1000)
      }
    });

    const newAccessToken = generateAccessToken({
      userId: payload.userId,
      email: authDetails.user.email,
      roles: authDetails.roles,
      permissions: authDetails.permissions
    });

    const newRefreshToken = generateRefreshToken({
      userId: payload.userId,
      tokenId: newTokenRecord.id,
      family: payload.family
    });

    const tokenHash = crypto.createHash('sha256').update(newRefreshToken).digest('hex');
    await prisma.refreshToken.update({
      where: { id: newTokenRecord.id },
      data: { tokenHash }
    });

    const tokenObj = {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      tokenType: 'Bearer',
      expiresIn: ENV.JWT_ACCESS_EXPIRATION
    };

    return {
      ...tokenObj,
      tokens: tokenObj
    };
  }

  /**
   * Revoke a refresh token on logout
   */
  async logout(rawRefreshToken?: string, userId?: string) {
    if (userId) {
      await prisma.userActivityLog.create({
        data: {
          userId,
          activityType: ActivityType.LOGOUT,
          entityType: 'User',
          entityId: userId
        }
      });
    }

    if (!rawRefreshToken) return;

    try {
      const payload = verifyRefreshToken(rawRefreshToken);
      await prisma.refreshToken.updateMany({
        where: { id: payload.tokenId },
        data: { isRevoked: true }
      });
    } catch {
      // Ignore token verification errors during logout
    }
  }

  /**
   * Request password reset token
   */
  async forgotPassword(email: string) {
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return { message: 'If this email is registered, a password reset link has been prepared.' };
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

    await prisma.passwordReset.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000) // 1 hour
      }
    });

    logger.info(`Password reset requested for ${email}. Token: ${resetToken}`);
    return {
      message: 'If this email is registered, a password reset link has been prepared.',
      debugToken: process.env.NODE_ENV !== 'production' ? resetToken : undefined
    };
  }

  /**
   * Reset password with valid token
   */
  async resetPassword(input: ResetPasswordInput) {
    const tokenHash = crypto.createHash('sha256').update(input.token).digest('hex');

    const resetRecord = await prisma.passwordReset.findFirst({
      where: {
        tokenHash,
        isUsed: false,
        expiresAt: { gt: new Date() }
      }
    });

    if (!resetRecord) {
      throw new BadRequestError('Invalid or expired password reset token.');
    }

    const newPasswordHash = await hashPassword(input.newPassword);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetRecord.userId },
        data: { passwordHash: newPasswordHash }
      }),
      prisma.passwordReset.update({
        where: { id: resetRecord.id },
        data: { isUsed: true }
      }),
      prisma.refreshToken.updateMany({
        where: { userId: resetRecord.userId },
        data: { isRevoked: true }
      })
    ]);

    return { message: 'Password updated successfully. Please log in with your new password.' };
  }

  /**
   * Get current authenticated user profile
   */
  async getMe(userId: string) {
    const authDetails = await this.getUserAuthDetails(userId);
    const streak = await prisma.userLoginStreak.findUnique({
      where: { userId }
    });

    const memberships = await prisma.clientMember.findMany({
      where: { userId },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true
          }
        }
      }
    });

    const userObj = {
      id: authDetails.user.id,
      email: authDetails.user.email,
      firstName: authDetails.user.firstName,
      lastName: authDetails.user.lastName,
      avatarUrl: authDetails.user.avatarUrl,
      roles: authDetails.roles,
      permissions: authDetails.permissions,
      streak: streak
        ? {
            currentStreak: streak.currentStreak,
            longestStreak: streak.longestStreak,
            totalActiveDays: streak.totalActiveDays,
            lastActiveDate: streak.lastActiveDate
          }
        : null,
      clients: memberships.map(tm => ({
        id: tm.client.id,
        name: tm.client.name,
        slug: tm.client.slug,
        description: tm.client.description,
        role: tm.role
      }))
    };

    return {
      ...userObj,
      user: userObj
    };
  }

  /**
   * Calculates consecutive day streaks for engagement metrics
   */
  private async updateUserLoginStreak(userId: string): Promise<void> {
    const streak = await prisma.userLoginStreak.findUnique({
      where: { userId }
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (!streak) {
      await prisma.userLoginStreak.create({
        data: {
          userId,
          currentStreak: 1,
          longestStreak: 1,
          totalActiveDays: 1,
          lastActiveDate: new Date()
        }
      });
      return;
    }

    const lastActive = new Date(streak.lastActiveDate);
    lastActive.setHours(0, 0, 0, 0);

    const diffDays = Math.floor((today.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return;
    } else if (diffDays === 1) {
      const newStreak = streak.currentStreak + 1;
      await prisma.userLoginStreak.update({
        where: { userId },
        data: {
          currentStreak: newStreak,
          longestStreak: Math.max(newStreak, streak.longestStreak),
          totalActiveDays: streak.totalActiveDays + 1,
          lastActiveDate: new Date()
        }
      });
    } else {
      await prisma.userLoginStreak.update({
        where: { userId },
        data: {
          currentStreak: 1,
          totalActiveDays: streak.totalActiveDays + 1,
          lastActiveDate: new Date()
        }
      });
    }
  }
}

export const authService = new AuthService();
