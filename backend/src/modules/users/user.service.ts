import { RoleName, Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { NotFoundError, BadRequestError } from '../../shared/errors/app-error';
import { ListUsersQuery, UpdateUserInput, AssignRolesInput } from './user.schema';

export class UserService {
  async listUsers(query: ListUsersQuery) {
    const { page, limit, search, role, isActive } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {
      deletedAt: null
    };

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (role) {
      where.userRoles = {
        some: {
          role: {
            name: role
          }
        }
      };
    }

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
          isActive: true,
          createdAt: true,
          userRoles: {
            select: {
              role: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          },
          loginStreak: {
            select: {
              currentStreak: true,
              longestStreak: true,
              totalActiveDays: true
            }
          }
        }
      })
    ]);

    const formattedUsers = users.map(u => ({
      id: u.id,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      avatarUrl: u.avatarUrl,
      isActive: u.isActive,
      createdAt: u.createdAt,
      roles: u.userRoles.map(ur => ur.role.name),
      streak: u.loginStreak
    }));

    return {
      users: formattedUsers,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async getUserById(id: string) {
    const user = await prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        isActive: true,
        createdAt: true,
        userRoles: {
          select: {
            role: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        loginStreak: true,
        clientMembers: {
          include: {
            client: {
              select: {
                id: true,
                name: true,
                slug: true
              }
            }
          }
        }
      }
    });

    if (!user) throw new NotFoundError('User not found');

    return {
      ...user,
      roles: user.userRoles.map(ur => ur.role.name),
      clients: user.clientMembers.map(tm => ({
        id: tm.client.id,
        name: tm.client.name,
        slug: tm.client.slug,
        role: tm.role
      }))
    };
  }

  async updateUser(id: string, input: UpdateUserInput) {
    const user = await prisma.user.findFirst({
      where: { id, deletedAt: null }
    });

    if (!user) throw new NotFoundError('User not found');

    const updated = await prisma.user.update({
      where: { id },
      data: {
        firstName: input.firstName,
        lastName: input.lastName,
        avatarUrl: input.avatarUrl,
        isActive: input.isActive
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        isActive: true,
        updatedAt: true
      }
    });

    return updated;
  }

  async assignRoles(userId: string, input: AssignRolesInput) {
    const user = await prisma.user.findFirst({
      where: { id: userId, deletedAt: null }
    });

    if (!user) throw new NotFoundError('User not found');

    const roles = await prisma.role.findMany({
      where: { name: { in: input.roleNames } }
    });

    if (roles.length !== input.roleNames.length) {
      throw new BadRequestError('One or more specified role names are invalid');
    }

    // Replace roles in transaction
    await prisma.$transaction([
      prisma.userRole.deleteMany({ where: { userId } }),
      prisma.userRole.createMany({
        data: roles.map(r => ({ userId, roleId: r.id }))
      })
    ]);

    return { message: 'User roles updated successfully', roles: input.roleNames };
  }

  async deleteUser(id: string) {
    const user = await prisma.user.findFirst({
      where: { id, deletedAt: null }
    });

    if (!user) throw new NotFoundError('User not found');

    // Soft delete user and revoke all refresh tokens
    await prisma.$transaction([
      prisma.user.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          isActive: false
        }
      }),
      prisma.refreshToken.updateMany({
        where: { userId: id },
        data: { isRevoked: true }
      })
    ]);

    return { message: 'User account soft deleted successfully' };
  }
}

export const userService = new UserService();
