import { ClientRole, RoleName } from '@prisma/client';
import { prisma } from '../../config/database';
import { ConflictError, NotFoundError, BadRequestError } from '../../shared/errors/app-error';
import { hashPassword } from '../../shared/utils/password.util';
import { CreateClientInput, UpdateClientInput, AddClientMemberInput, UpdateClientMemberInput } from './client.schema';

export class ClientService {
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  async createClient(userId: string, input: CreateClientInput) {
    const slug = input.slug || this.generateSlug(input.name);

    const existing = await prisma.client.findUnique({
      where: { slug }
    });

    if (existing) {
      throw new ConflictError(`Client with slug '${slug}' already exists. Please choose a different name or slug.`);
    }

    const client = await prisma.client.create({
      data: {
        name: input.name,
        slug,
        description: input.description,
        members: {
          create: {
            userId,
            role: ClientRole.OWNER
          }
        }
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                avatarUrl: true
              }
            }
          }
        }
      }
    });

    return client;
  }

  async listUserClients(userId: string) {
    const memberships = await prisma.clientMember.findMany({
      where: {
        userId,
        client: { isArchived: false }
      },
      include: {
        client: {
          include: {
            _count: {
              select: {
                members: true,
                tasks: true
              }
            }
          }
        }
      },
      orderBy: { joinedAt: 'desc' }
    });

    return memberships.map(m => ({
      ...m.client,
      myRole: m.role,
      memberCount: m.client._count.members,
      taskCount: m.client._count.tasks
    }));
  }

  async getClientMembers(clientId: string) {
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true, isArchived: true },
    });

    if (!client || client.isArchived) {
      throw new NotFoundError('Client workspace not found or has been archived.');
    }

    const members = await prisma.clientMember.findMany({
      where: { clientId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { joinedAt: 'asc' },
    });

    return members;
  }

  async getClientById(clientId: string) {
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                avatarUrl: true
              }
            }
          }
        },
        labels: true,
        workflows: {
          where: { status: 'ACTIVE' },
          select: { id: true, name: true, description: true }
        },
        _count: {
          select: {
            tasks: true
          }
        }
      }
    });

    if (!client || client.isArchived) {
      throw new NotFoundError('Client workspace not found or has been archived.');
    }

    return client;
  }

  async updateClient(clientId: string, input: UpdateClientInput) {
    const client = await prisma.client.findUnique({
      where: { id: clientId }
    });

    if (!client || client.isArchived) {
      throw new NotFoundError('Client workspace not found');
    }

    const updated = await prisma.client.update({
      where: { id: clientId },
      data: {
        name: input.name,
        description: input.description
      }
    });

    return updated;
  }

  async archiveClient(clientId: string) {
    const client = await prisma.client.findUnique({
      where: { id: clientId }
    });

    if (!client) throw new NotFoundError('Client workspace not found');

    await prisma.client.update({
      where: { id: clientId },
      data: { isArchived: true }
    });

    return { message: 'Client workspace archived successfully' };
  }

  async addMember(clientId: string, input: AddClientMemberInput) {
    let targetUserId = input.userId;

    if (!targetUserId && input.email) {
      const email = input.email.toLowerCase().trim();
      let user = await prisma.user.findFirst({
        where: { email, deletedAt: null }
      });

      if (!user) {
        const memberRole = await prisma.role.findFirst({
          where: { name: { in: [RoleName.MEMBER, RoleName.TEAM_MEMBER] } }
        });
        const hashedPassword = await hashPassword(input.password || 'Password123!');
        user = await prisma.user.create({
          data: {
            email,
            passwordHash: hashedPassword,
            firstName: input.firstName || email.split('@')[0],
            lastName: input.lastName || 'Member',
            isActive: true,
            userRoles: memberRole
              ? {
                  create: { roleId: memberRole.id }
                }
              : undefined
          }
        });
      }
      targetUserId = user.id;
    }

    if (!targetUserId) {
      throw new BadRequestError('Either userId or email must be provided to add a member');
    }

    const user = await prisma.user.findFirst({
      where: { id: targetUserId, deletedAt: null }
    });

    if (!user) throw new NotFoundError('User to add was not found');

    const existing = await prisma.clientMember.findUnique({
      where: {
        clientId_userId: {
          clientId,
          userId: targetUserId
        }
      }
    });

    if (existing) {
      throw new ConflictError('User is already a member of this client');
    }

    const member = await prisma.clientMember.create({
      data: {
        clientId,
        userId: targetUserId,
        role: input.role || ClientRole.MEMBER
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            avatarUrl: true
          }
        }
      }
    });

    return member;
  }

  async updateMemberRole(clientId: string, targetUserId: string, input: UpdateClientMemberInput) {
    const membership = await prisma.clientMember.findUnique({
      where: {
        clientId_userId: {
          clientId,
          userId: targetUserId
        }
      }
    });

    if (!membership) {
      throw new NotFoundError('User is not a member of this client');
    }

    if (membership.role === ClientRole.OWNER && input.role !== ClientRole.OWNER) {
      const ownerCount = await prisma.clientMember.count({
        where: { clientId, role: ClientRole.OWNER }
      });
      if (ownerCount <= 1) {
        throw new BadRequestError('Cannot demote the sole owner of a client. Please promote another owner first.');
      }
    }

    const updated = await prisma.clientMember.update({
      where: {
        clientId_userId: {
          clientId,
          userId: targetUserId
        }
      },
      data: { role: input.role },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            avatarUrl: true
          }
        }
      }
    });

    return updated;
  }

  async removeMember(clientId: string, targetUserId: string) {
    const membership = await prisma.clientMember.findUnique({
      where: {
        clientId_userId: {
          clientId,
          userId: targetUserId
        }
      }
    });

    if (!membership) {
      throw new NotFoundError('User is not a member of this client');
    }

    if (membership.role === ClientRole.OWNER) {
      const ownerCount = await prisma.clientMember.count({
        where: { clientId, role: ClientRole.OWNER }
      });
      if (ownerCount <= 1) {
        throw new BadRequestError('Cannot remove the sole owner of a client. Please transfer ownership first.');
      }
    }

    await prisma.clientMember.delete({
      where: {
        clientId_userId: {
          clientId,
          userId: targetUserId
        }
      }
    });

    return { message: 'Member removed from client successfully' };
  }
}

export const clientService = new ClientService();
