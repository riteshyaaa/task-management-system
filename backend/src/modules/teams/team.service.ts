import { TeamRole } from '@prisma/client';
import { prisma } from '../../config/database';
import { ConflictError, NotFoundError, BadRequestError } from '../../shared/errors/app-error';
import { CreateTeamInput, UpdateTeamInput, AddTeamMemberInput, UpdateTeamMemberInput } from './team.schema';

export class TeamService {
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  async createTeam(userId: string, input: CreateTeamInput) {
    const slug = input.slug || this.generateSlug(input.name);

    const existing = await prisma.team.findUnique({
      where: { slug }
    });

    if (existing) {
      throw new ConflictError(`Team with slug '${slug}' already exists. Please choose a different name or slug.`);
    }

    const team = await prisma.team.create({
      data: {
        name: input.name,
        slug,
        description: input.description,
        members: {
          create: {
            userId,
            role: TeamRole.OWNER
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

    return team;
  }

  async listUserTeams(userId: string) {
    const memberships = await prisma.teamMember.findMany({
      where: {
        userId,
        team: { isArchived: false }
      },
      include: {
        team: {
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
      ...m.team,
      myRole: m.role,
      memberCount: m.team._count.members,
      taskCount: m.team._count.tasks
    }));
  }

  async getTeamMembers(teamId: string) {
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: { id: true, isArchived: true },
    });

    if (!team || team.isArchived) {
      throw new NotFoundError('Team workspace not found or has been archived.');
    }

    const members = await prisma.teamMember.findMany({
      where: { teamId },
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

  async getTeamById(teamId: string) {
    const team = await prisma.team.findUnique({
      where: { id: teamId },
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

    if (!team || team.isArchived) {
      throw new NotFoundError('Team workspace not found or has been archived.');
    }

    return team;
  }

  async updateTeam(teamId: string, input: UpdateTeamInput) {
    const team = await prisma.team.findUnique({
      where: { id: teamId }
    });

    if (!team || team.isArchived) {
      throw new NotFoundError('Team workspace not found');
    }

    const updated = await prisma.team.update({
      where: { id: teamId },
      data: {
        name: input.name,
        description: input.description
      }
    });

    return updated;
  }

  async archiveTeam(teamId: string) {
    const team = await prisma.team.findUnique({
      where: { id: teamId }
    });

    if (!team) throw new NotFoundError('Team workspace not found');

    await prisma.team.update({
      where: { id: teamId },
      data: { isArchived: true }
    });

    return { message: 'Team workspace archived successfully' };
  }

  async addMember(teamId: string, input: AddTeamMemberInput) {
    const user = await prisma.user.findFirst({
      where: { id: input.userId, deletedAt: null }
    });

    if (!user) throw new NotFoundError('User to add was not found');

    const existing = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId,
          userId: input.userId
        }
      }
    });

    if (existing) {
      throw new ConflictError('User is already a member of this team workspace');
    }

    const membership = await prisma.teamMember.create({
      data: {
        teamId,
        userId: input.userId,
        role: input.role
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

    return membership;
  }

  async updateMemberRole(teamId: string, targetUserId: string, input: UpdateTeamMemberInput) {
    const membership = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId,
          userId: targetUserId
        }
      }
    });

    if (!membership) {
      throw new NotFoundError('User is not a member of this team');
    }

    const updated = await prisma.teamMember.update({
      where: {
        teamId_userId: {
          teamId,
          userId: targetUserId
        }
      },
      data: { role: input.role }
    });

    return updated;
  }

  async removeMember(teamId: string, targetUserId: string) {
    const membership = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId,
          userId: targetUserId
        }
      }
    });

    if (!membership) {
      throw new NotFoundError('User is not a member of this team');
    }

    if (membership.role === TeamRole.OWNER) {
      const ownerCount = await prisma.teamMember.count({
        where: { teamId, role: TeamRole.OWNER }
      });
      if (ownerCount <= 1) {
        throw new BadRequestError('Cannot remove the sole owner of a team. Please transfer ownership first.');
      }
    }

    await prisma.teamMember.delete({
      where: {
        teamId_userId: {
          teamId,
          userId: targetUserId
        }
      }
    });

    return { message: 'Member removed from team successfully' };
  }
}

export const teamService = new TeamService();
