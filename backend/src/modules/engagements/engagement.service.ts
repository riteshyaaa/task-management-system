import { Prisma, TaskStatus, TaskPriority, EngagementStatus } from '@prisma/client';
import { prisma } from '../../config/database';
import { NotFoundError, ConflictError, BadRequestError } from '../../shared/errors/app-error';
import {
  CreateEngagementInput,
  UpdateEngagementInput,
  FilterEngagementsQuery
} from './engagement.schema';

export class EngagementService {
  /**
   * Create an engagement with atomic task instantiation and duplicate prevention
   */
  async createEngagement(createdById: string, input: CreateEngagementInput) {
    const periodStartDate = new Date(input.periodStart);
    const periodEndDate = new Date(input.periodEnd);

    if (periodStartDate > periodEndDate) {
      throw new BadRequestError('periodStart cannot be after periodEnd');
    }

    // 1. Verify client and service type exist
    const [client, serviceType] = await Promise.all([
      prisma.client.findUnique({ where: { id: input.clientId } }),
      prisma.serviceType.findUnique({ where: { id: input.serviceTypeId } })
    ]);

    if (!client || client.isArchived) {
      throw new NotFoundError('Client workspace not found or is archived');
    }

    if (!serviceType || !serviceType.isActive) {
      throw new NotFoundError('Service type not found or is inactive');
    }

    // 2. Pre-check for duplicate engagement
    const existing = await prisma.engagement.findFirst({
      where: {
        clientId: input.clientId,
        serviceTypeId: input.serviceTypeId,
        periodStart: periodStartDate,
        periodEnd: periodEndDate
      }
    });

    if (existing) {
      throw new ConflictError(
        'An engagement for this client, service type, and period already exists.',
        undefined,
        'DUPLICATE_ENGAGEMENT'
      );
    }

    // 3. Find template for task generation
    let template = null;
    if (input.templateId) {
      template = await prisma.taskTemplate.findUnique({
        where: { id: input.templateId },
        include: {
          templateItems: { orderBy: { position: 'asc' } }
        }
      });
    } else if (input.autoGenerateTasks) {
      // Find default template linked to this serviceType
      template = await prisma.taskTemplate.findFirst({
        where: {
          serviceTypeId: input.serviceTypeId
        },
        include: {
          templateItems: { orderBy: { position: 'asc' } }
        }
      });

      // Fallback: template with same name or general template
      if (!template) {
        template = await prisma.taskTemplate.findFirst({
          where: {
            clientId: input.clientId
          },
          include: {
            templateItems: { orderBy: { position: 'asc' } }
          }
        });
      }
    }

    // Helper for variable interpolation
    const interpolate = (text: string | null | undefined): string => {
      if (!text) return '';
      return text
        .replace(/\{\{\s*client_name\s*\}\}/gi, client.name)
        .replace(/\{\{\s*period_start\s*\}\}/gi, input.periodStart)
        .replace(/\{\{\s*period_end\s*\}\}/gi, input.periodEnd)
        .replace(/\{\{\s*service_name\s*\}\}/gi, serviceType.name)
        .replace(/\{\{\s*engagement_title\s*\}\}/gi, input.title);
    };

    try {
      return await prisma.$transaction(async (tx) => {
        // Create Engagement
        const engagement = await tx.engagement.create({
          data: {
            clientId: input.clientId,
            serviceTypeId: input.serviceTypeId,
            title: input.title,
            description: input.description,
            status: input.status,
            periodStart: periodStartDate,
            periodEnd: periodEndDate,
            dueDate: input.dueDate ? new Date(input.dueDate) : null,
            managerId: input.managerId,
            createdById
          },
          include: {
            client: { select: { id: true, name: true } },
            serviceType: { select: { id: true, name: true, defaultCadence: true } },
            manager: { select: { id: true, email: true, firstName: true, lastName: true } }
          }
        });

        // Instantiate tasks from template if available
        if (input.autoGenerateTasks && template) {
          if (template.templateItems && template.templateItems.length > 0) {
            for (let i = 0; i < template.templateItems.length; i++) {
              const item = template.templateItems[i];
              await tx.task.create({
                data: {
                  title: interpolate(item.title),
                  description: interpolate(item.description),
                  status: TaskStatus.NOT_STARTED,
                  priority: template.defaultPriority || TaskPriority.MEDIUM,
                  clientId: input.clientId,
                  engagementId: engagement.id,
                  reporterId: createdById,
                  assigneeId: input.assigneeId || input.managerId || null,
                  dueDate: input.dueDate ? new Date(input.dueDate) : null,
                  estimatedHours: item.estimatedHours,
                  position: i,
                  templateId: template.id
                }
              });
            }
          } else {
            // Create single task from template definition
            await tx.task.create({
              data: {
                title: interpolate(template.defaultTitle) || `${serviceType.name} - ${client.name}`,
                description: interpolate(template.defaultBody),
                status: TaskStatus.NOT_STARTED,
                priority: template.defaultPriority,
                clientId: input.clientId,
                engagementId: engagement.id,
                reporterId: createdById,
                assigneeId: input.assigneeId || input.managerId || null,
                dueDate: input.dueDate ? new Date(input.dueDate) : null,
                estimatedHours: template.estimatedHours,
                position: 0,
                templateId: template.id
              }
            });
          }
        } else if (input.autoGenerateTasks) {
          // Default: create an initial task for the engagement
          await tx.task.create({
            data: {
              title: `${serviceType.name} - ${client.name} (${input.periodStart} to ${input.periodEnd})`,
              description: input.description || `Deliverable for ${serviceType.name}`,
              status: TaskStatus.NOT_STARTED,
              priority: TaskPriority.MEDIUM,
              clientId: input.clientId,
              engagementId: engagement.id,
              reporterId: createdById,
              assigneeId: input.assigneeId || input.managerId || null,
              dueDate: input.dueDate ? new Date(input.dueDate) : null,
              position: 0
            }
          });
        }

        // Return engagement with generated tasks count
        const taskCount = await tx.task.count({
          where: { engagementId: engagement.id }
        });

        return {
          ...engagement,
          taskCount
        };
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictError(
          'An engagement for this client, service type, and period already exists.',
          undefined,
          'DUPLICATE_ENGAGEMENT'
        );
      }
      throw error;
    }
  }

  /**
   * List engagements with filtering, task summaries, and pagination
   */
  async listEngagements(query: FilterEngagementsQuery) {
    const where: Prisma.EngagementWhereInput = {};

    if (query.clientId) {
      where.clientId = query.clientId;
    }

    if (query.serviceTypeId) {
      where.serviceTypeId = query.serviceTypeId;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.managerId) {
      where.managerId = query.managerId;
    }

    if (query.periodStartFrom || query.periodEndTo) {
      where.periodStart = {};
      if (query.periodStartFrom) where.periodStart.gte = new Date(query.periodStartFrom);
      if (query.periodEndTo) where.periodStart.lte = new Date(query.periodEndTo);
    }

    if (query.search && query.search.trim() !== '') {
      where.OR = [
        { title: { contains: query.search.trim(), mode: 'insensitive' } },
        { description: { contains: query.search.trim(), mode: 'insensitive' } },
        { client: { name: { contains: query.search.trim(), mode: 'insensitive' } } },
        { serviceType: { name: { contains: query.search.trim(), mode: 'insensitive' } } }
      ];
    }

    const page = query.page || 1;
    const limit = query.limit || 50;
    const skip = (page - 1) * limit;

    const [total, engagements] = await Promise.all([
      prisma.engagement.count({ where }),
      prisma.engagement.findMany({
        where,
        skip,
        take: limit,
        orderBy: { periodStart: 'desc' },
        include: {
          client: {
            select: { id: true, name: true, slug: true }
          },
          serviceType: {
            select: { id: true, name: true, defaultCadence: true, estimatedHours: true }
          },
          manager: {
            select: { id: true, email: true, firstName: true, lastName: true, avatarUrl: true }
          },
          createdBy: {
            select: { id: true, firstName: true, lastName: true }
          },
          tasks: {
            where: { isDeleted: false },
            select: { id: true, status: true, priority: true }
          },
          _count: {
            select: { tasks: true }
          }
        }
      })
    ]);

    // Compute task metrics for each engagement
    const items = engagements.map((eng) => {
      const totalTasks = eng.tasks.length;
      const completedTasks = eng.tasks.filter(
        (t) => t.status === TaskStatus.COMPLETED || (t.status as any) === TaskStatus.DONE
      ).length;
      const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      return {
        id: eng.id,
        clientId: eng.clientId,
        serviceTypeId: eng.serviceTypeId,
        title: eng.title,
        description: eng.description,
        status: eng.status,
        periodStart: eng.periodStart,
        periodEnd: eng.periodEnd,
        dueDate: eng.dueDate,
        managerId: eng.managerId,
        createdAt: eng.createdAt,
        updatedAt: eng.updatedAt,
        client: eng.client,
        serviceType: eng.serviceType,
        manager: eng.manager,
        createdBy: eng.createdBy,
        totalTasks,
        completedTasks,
        progressPercent,
        progressPercentage: progressPercent
      };
    });

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get single engagement with detailed task breakdown
   */
  async getEngagementById(id: string) {
    const engagement = await prisma.engagement.findUnique({
      where: { id },
      include: {
        client: {
          select: { id: true, name: true, slug: true, isArchived: true }
        },
        serviceType: {
          select: { id: true, name: true, description: true, defaultCadence: true, estimatedHours: true }
        },
        manager: {
          select: { id: true, email: true, firstName: true, lastName: true, avatarUrl: true }
        },
        createdBy: {
          select: { id: true, email: true, firstName: true, lastName: true }
        },
        tasks: {
          where: { isDeleted: false },
          orderBy: { position: 'asc' },
          include: {
            assignee: {
              select: { id: true, email: true, firstName: true, lastName: true, avatarUrl: true }
            },
            reporter: {
              select: { id: true, firstName: true, lastName: true }
            },
            subtasks: {
              where: { isDeleted: false },
              select: { id: true, title: true, status: true }
            },
            _count: {
              select: { comments: true, subtasks: true }
            }
          }
        }
      }
    });

    if (!engagement) {
      throw new NotFoundError('Engagement not found');
    }

    const totalTasks = engagement.tasks.length;
    const completedTasks = engagement.tasks.filter(
      (t) => t.status === TaskStatus.COMPLETED || (t.status as any) === TaskStatus.DONE
    ).length;
    const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return {
      ...engagement,
      totalTasks,
      completedTasks,
      progressPercent,
      progressPercentage: progressPercent
    };
  }

  /**
   * Update engagement details
   */
  async updateEngagement(id: string, input: UpdateEngagementInput) {
    const existing = await prisma.engagement.findUnique({
      where: { id }
    });

    if (!existing) {
      throw new NotFoundError('Engagement not found');
    }

    const periodStartDate = input.periodStart ? new Date(input.periodStart) : existing.periodStart;
    const periodEndDate = input.periodEnd ? new Date(input.periodEnd) : existing.periodEnd;

    if (periodStartDate > periodEndDate) {
      throw new BadRequestError('periodStart cannot be after periodEnd');
    }

    // Check for duplicate conflict if period was changed
    if (input.periodStart || input.periodEnd) {
      const duplicate = await prisma.engagement.findFirst({
        where: {
          id: { not: id },
          clientId: existing.clientId,
          serviceTypeId: existing.serviceTypeId,
          periodStart: periodStartDate,
          periodEnd: periodEndDate
        }
      });

      if (duplicate) {
        throw new ConflictError(
          'An engagement for this client, service type, and period already exists.',
          undefined,
          'DUPLICATE_ENGAGEMENT'
        );
      }
    }

    return prisma.engagement.update({
      where: { id },
      data: {
        title: input.title,
        description: input.description,
        status: input.status,
        periodStart: input.periodStart ? periodStartDate : undefined,
        periodEnd: input.periodEnd ? periodEndDate : undefined,
        dueDate: input.dueDate !== undefined ? (input.dueDate ? new Date(input.dueDate) : null) : undefined,
        managerId: input.managerId !== undefined ? input.managerId : undefined
      },
      include: {
        client: { select: { id: true, name: true } },
        serviceType: { select: { id: true, name: true } },
        manager: { select: { id: true, email: true, firstName: true, lastName: true } }
      }
    });
  }

  /**
   * Delete or archive engagement
   */
  async deleteEngagement(id: string) {
    const existing = await prisma.engagement.findUnique({
      where: { id }
    });

    if (!existing) {
      throw new NotFoundError('Engagement not found');
    }

    return prisma.engagement.delete({
      where: { id }
    });
  }
}

export const engagementService = new EngagementService();
