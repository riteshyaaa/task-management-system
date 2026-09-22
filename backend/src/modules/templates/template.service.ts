import { ActivityType, Prisma, TaskPriority, TaskStatus } from '@prisma/client';
import { prisma } from '../../config/database';
import { NotFoundError, ConflictError, BadRequestError } from '../../shared/errors/app-error';
import { CreateTemplateInput, UpdateTemplateInput, InstantiateTemplateInput } from './template.schema';
import { AuditContext } from '../../shared/types/express';

export class TemplateService {
  /**
   * Helper method to interpolate variables in a string with {{var}} syntax
   */
  private interpolate(templateString: string | null | undefined, variables: Record<string, any>): string {
    if (!templateString) return '';
    return templateString.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, varName) => {
      return variables[varName] !== undefined ? String(variables[varName]) : match;
    });
  }

  async createTemplate(userId: string, input: CreateTemplateInput) {
    const existing = await prisma.taskTemplate.findUnique({
      where: {
        clientId_name: {
          clientId: input.clientId,
          name: input.name
        }
      }
    });

    if (existing) {
      throw new ConflictError(`Template '${input.name}' already exists in this client workspace`);
    }

    const template = await prisma.$transaction(async (tx) => {
      const created = await tx.taskTemplate.create({
        data: {
          clientId: input.clientId,
          name: input.name,
          description: input.description,
          defaultTitle: input.defaultTitle,
          defaultBody: input.defaultBody,
          defaultPriority: input.defaultPriority || TaskPriority.MEDIUM,
          estimatedHours: input.estimatedHours ? new Prisma.Decimal(input.estimatedHours) : null,
          variables: input.variables as any,
          createdById: userId,
          templateItems: {
            create: (input.items || []).map((item, index) => ({
              title: item.title,
              description: item.description,
              position: item.position !== undefined ? item.position : index,
              estimatedHours: item.estimatedHours ? new Prisma.Decimal(item.estimatedHours) : null
            }))
          }
        },
        include: {
          templateItems: {
            orderBy: { position: 'asc' }
          },
          createdBy: {
            select: { id: true, firstName: true, lastName: true, email: true }
          }
        }
      });

      return created;
    });

    return template;
  }

  async listTemplates(clientId: string) {
    const templates = await prisma.taskTemplate.findMany({
      where: { clientId },
      orderBy: { name: 'asc' },
      include: {
        templateItems: {
          orderBy: { position: 'asc' }
        },
        createdBy: {
          select: { id: true, firstName: true, lastName: true, email: true }
        },
        _count: {
          select: { generatedTasks: true }
        }
      }
    });

    return templates;
  }

  async getTemplateById(templateId: string) {
    const template = await prisma.taskTemplate.findUnique({
      where: { id: templateId },
      include: {
        templateItems: {
          orderBy: { position: 'asc' }
        },
        createdBy: {
          select: { id: true, firstName: true, lastName: true, email: true }
        },
        _count: {
          select: { generatedTasks: true }
        }
      }
    });

    if (!template) throw new NotFoundError('Task template not found');
    return template;
  }

  async updateTemplate(templateId: string, input: UpdateTemplateInput) {
    const template = await prisma.taskTemplate.findUnique({
      where: { id: templateId }
    });

    if (!template) throw new NotFoundError('Task template not found');

    if (input.name && input.name !== template.name) {
      const existing = await prisma.taskTemplate.findUnique({
        where: {
          clientId_name: {
            clientId: template.clientId,
            name: input.name
          }
        }
      });
      if (existing) {
        throw new ConflictError(`Template '${input.name}' already exists in this client workspace`);
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (input.items) {
        // Replace items
        await tx.templateItem.deleteMany({
          where: { templateId }
        });

        await tx.templateItem.createMany({
          data: input.items.map((item, index) => ({
            templateId,
            title: item.title,
            description: item.description,
            position: item.position !== undefined ? item.position : index,
            estimatedHours: item.estimatedHours ? new Prisma.Decimal(item.estimatedHours) : null
          }))
        });
      }

      return tx.taskTemplate.update({
        where: { id: templateId },
        data: {
          name: input.name,
          description: input.description,
          defaultTitle: input.defaultTitle,
          defaultBody: input.defaultBody,
          defaultPriority: input.defaultPriority,
          estimatedHours: input.estimatedHours !== undefined
            ? input.estimatedHours ? new Prisma.Decimal(input.estimatedHours) : null
            : undefined,
          variables: input.variables !== undefined ? (input.variables as any) : undefined
        },
        include: {
          templateItems: {
            orderBy: { position: 'asc' }
          }
        }
      });
    });

    return updated;
  }

  async deleteTemplate(templateId: string) {
    const template = await prisma.taskTemplate.findUnique({
      where: { id: templateId }
    });

    if (!template) throw new NotFoundError('Task template not found');

    await prisma.taskTemplate.delete({
      where: { id: templateId }
    });

    return { message: 'Task template deleted successfully' };
  }

  /**
   * Instantiate a new task from a template, executing variable substitution
   * and generating all child checklist subtasks.
   */
  async instantiateTemplate(
    templateId: string,
    userId: string,
    input: InstantiateTemplateInput,
    auditContext?: AuditContext
  ) {
    const template = await prisma.taskTemplate.findUnique({
      where: { id: templateId },
      include: {
        templateItems: {
          orderBy: { position: 'asc' }
        }
      }
    });

    if (!template) {
      throw new NotFoundError('Task template not found');
    }

    const variables = input.variables || {};

    // Check required variables if template defines them
    const requiredVars = Array.isArray(template.variables) ? (template.variables as string[]) : [];
    const missingVars = requiredVars.filter(v => variables[v] === undefined || variables[v] === '');
    if (missingVars.length > 0) {
      throw new BadRequestError(`Missing required template variables: ${missingVars.join(', ')}`);
    }

    // Interpolate default title & body
    const taskTitle = this.interpolate(template.defaultTitle, variables);
    const taskDescription = this.interpolate(template.defaultBody, variables);

    const generatedTask = await prisma.$transaction(async (tx) => {
      // Find current max position
      const lastTask = await tx.task.findFirst({
        where: { clientId: template.clientId, status: TaskStatus.TODO, isDeleted: false },
        orderBy: { position: 'desc' },
        select: { position: true }
      });
      const nextPosition = lastTask ? lastTask.position + 1000 : 1000;

      // Create Parent Task
      const task = await tx.task.create({
        data: {
          title: taskTitle,
          description: taskDescription,
          clientId: template.clientId,
          reporterId: userId,
          assigneeId: input.assigneeId || null,
          status: TaskStatus.TODO,
          priority: input.priority || template.defaultPriority,
          estimatedHours: template.estimatedHours,
          dueDate: input.dueDate ? new Date(input.dueDate) : null,
          startDate: input.startDate ? new Date(input.startDate) : null,
          templateId: template.id,
          position: nextPosition,
          metadata: {
            instantiatedFromTemplateId: template.id,
            instantiatedFromTemplateName: template.name,
            templateVariables: variables
          }
        }
      });

      // Create Subtasks for each template item
      if (template.templateItems.length > 0) {
        for (let i = 0; i < template.templateItems.length; i++) {
          const item = template.templateItems[i];
          const subtaskTitle = this.interpolate(item.title, variables);
          const subtaskDesc = this.interpolate(item.description, variables);

          await tx.task.create({
            data: {
              title: subtaskTitle,
              description: subtaskDesc || null,
              clientId: template.clientId,
              reporterId: userId,
              assigneeId: input.assigneeId || null,
              parentTaskId: task.id,
              status: TaskStatus.TODO,
              priority: input.priority || template.defaultPriority,
              estimatedHours: item.estimatedHours,
              position: (i + 1) * 1000,
              metadata: {
                isTemplateSubtask: true,
                templateItemId: item.id
              }
            }
          });
        }
      }

      // Add reporter as watcher
      await tx.taskWatcher.create({
        data: {
          taskId: task.id,
          userId
        }
      });

      return task;
    });

    // Log Activity
    await prisma.userActivityLog.create({
      data: {
        userId,
        activityType: ActivityType.TASK_CREATE,
        entityType: 'Task',
        entityId: generatedTask.id,
        clientId: template.clientId,
        ipAddress: auditContext?.ipAddress,
        metadata: {
          taskNumber: generatedTask.taskNumber,
          title: generatedTask.title,
          fromTemplateId: template.id,
          subtasksCount: template.templateItems.length
        }
      }
    });

    // Return complete task with subtasks
    return prisma.task.findUnique({
      where: { id: generatedTask.id },
      include: {
        subtasks: {
          where: { isDeleted: false },
          orderBy: { position: 'asc' }
        },
        assignee: {
          select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true }
        },
        reporter: {
          select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true }
        },
        template: true
      }
    });
  }
}

export const templateService = new TemplateService();
