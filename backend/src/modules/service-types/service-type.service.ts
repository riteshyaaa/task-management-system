import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { NotFoundError, ConflictError } from '../../shared/errors/app-error';
import {
  CreateServiceTypeInput,
  UpdateServiceTypeInput,
  FilterServiceTypesQuery
} from './service-type.schema';

export class ServiceTypeService {
  async createServiceType(input: CreateServiceTypeInput) {
    const existing = await prisma.serviceType.findUnique({
      where: { name: input.name }
    });

    if (existing) {
      throw new ConflictError(`Service type with name '${input.name}' already exists.`);
    }

    return prisma.serviceType.create({
      data: {
        name: input.name,
        description: input.description,
        defaultCadence: input.defaultCadence,
        estimatedHours: input.estimatedHours !== undefined && input.estimatedHours !== null
          ? new Prisma.Decimal(input.estimatedHours)
          : null,
        isActive: input.isActive ?? true
      },
      include: {
        _count: {
          select: {
            engagements: true,
            taskTemplates: true
          }
        }
      }
    });
  }

  async listServiceTypes(query: FilterServiceTypesQuery) {
    const where: Prisma.ServiceTypeWhereInput = {};

    if (query.isActive !== undefined) {
      where.isActive = query.isActive === 'true';
    }

    if (query.search && query.search.trim() !== '') {
      where.OR = [
        { name: { contains: query.search.trim(), mode: 'insensitive' } },
        { description: { contains: query.search.trim(), mode: 'insensitive' } }
      ];
    }

    const page = query.page || 1;
    const limit = query.limit || 50;
    const skip = (page - 1) * limit;

    const [total, items] = await Promise.all([
      prisma.serviceType.count({ where }),
      prisma.serviceType.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: {
          taskTemplates: {
            select: {
              id: true,
              name: true,
              defaultTitle: true,
              defaultPriority: true,
              estimatedHours: true
            }
          },
          _count: {
            select: {
              engagements: true,
              taskTemplates: true
            }
          }
        }
      })
    ]);

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

  async getServiceTypeById(id: string) {
    const serviceType = await prisma.serviceType.findUnique({
      where: { id },
      include: {
        taskTemplates: {
          include: {
            templateItems: {
              orderBy: { position: 'asc' }
            }
          }
        },
        _count: {
          select: {
            engagements: true,
            taskTemplates: true
          }
        }
      }
    });

    if (!serviceType) {
      throw new NotFoundError(`Service type not found`);
    }

    return serviceType;
  }

  async updateServiceType(id: string, input: UpdateServiceTypeInput) {
    const existing = await prisma.serviceType.findUnique({
      where: { id }
    });

    if (!existing) {
      throw new NotFoundError(`Service type not found`);
    }

    if (input.name && input.name !== existing.name) {
      const duplicate = await prisma.serviceType.findUnique({
        where: { name: input.name }
      });
      if (duplicate) {
        throw new ConflictError(`Service type with name '${input.name}' already exists.`);
      }
    }

    return prisma.serviceType.update({
      where: { id },
      data: {
        name: input.name,
        description: input.description,
        defaultCadence: input.defaultCadence,
        estimatedHours: input.estimatedHours !== undefined
          ? (input.estimatedHours !== null ? new Prisma.Decimal(input.estimatedHours) : null)
          : undefined,
        isActive: input.isActive
      },
      include: {
        _count: {
          select: {
            engagements: true,
            taskTemplates: true
          }
        }
      }
    });
  }

  async deleteServiceType(id: string) {
    const existing = await prisma.serviceType.findUnique({
      where: { id },
      include: {
        _count: {
          select: { engagements: true }
        }
      }
    });

    if (!existing) {
      throw new NotFoundError(`Service type not found`);
    }

    if (existing._count.engagements > 0) {
      // Soft-deactivate if linked to existing engagements
      return prisma.serviceType.update({
        where: { id },
        data: { isActive: false }
      });
    }

    return prisma.serviceType.delete({
      where: { id }
    });
  }
}

export const serviceTypeService = new ServiceTypeService();
