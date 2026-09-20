import { prisma } from '../../config/database';
import { NotFoundError, ConflictError } from '../../shared/errors/app-error';
import { CreateLabelInput, UpdateLabelInput } from './label.schema';

export class LabelService {
  async createLabel(input: CreateLabelInput) {
    const existing = await prisma.label.findUnique({
      where: {
        teamId_name: {
          teamId: input.teamId,
          name: input.name
        }
      }
    });

    if (existing) {
      throw new ConflictError(`Label '${input.name}' already exists in this team workspace`);
    }

    const label = await prisma.label.create({
      data: {
        name: input.name,
        color: input.color,
        description: input.description,
        teamId: input.teamId
      }
    });

    return label;
  }

  async listLabels(teamId: string) {
    const labels = await prisma.label.findMany({
      where: { teamId },
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { tasks: true }
        }
      }
    });

    return labels;
  }

  async updateLabel(labelId: string, input: UpdateLabelInput) {
    const label = await prisma.label.findUnique({
      where: { id: labelId }
    });

    if (!label) throw new NotFoundError('Label not found');

    if (input.name && input.name !== label.name) {
      const existing = await prisma.label.findUnique({
        where: {
          teamId_name: {
            teamId: label.teamId,
            name: input.name
          }
        }
      });
      if (existing) {
        throw new ConflictError(`Label '${input.name}' already exists in this team workspace`);
      }
    }

    const updated = await prisma.label.update({
      where: { id: labelId },
      data: {
        name: input.name,
        color: input.color,
        description: input.description
      }
    });

    return updated;
  }

  async deleteLabel(labelId: string) {
    const label = await prisma.label.findUnique({
      where: { id: labelId }
    });

    if (!label) throw new NotFoundError('Label not found');

    await prisma.label.delete({
      where: { id: labelId }
    });

    return { message: 'Label deleted successfully' };
  }
}

export const labelService = new LabelService();
