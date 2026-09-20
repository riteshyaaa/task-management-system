import { ActivityType } from '@prisma/client';
import { prisma } from '../../config/database';
import { NotFoundError, ForbiddenError } from '../../shared/errors/app-error';
import { CreateCommentInput, UpdateCommentInput } from './comment.schema';
import { AuditContext } from '../../shared/types/express';

export class CommentService {
  async addComment(taskId: string, userId: string, input: CreateCommentInput, auditContext?: AuditContext) {
    const task = await prisma.task.findUnique({
      where: { id: taskId }
    });

    if (!task || task.isDeleted) {
      throw new NotFoundError('Task not found');
    }

    const comment = await prisma.taskComment.create({
      data: {
        taskId,
        userId,
        content: input.content
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

    // Auto-watch task on comment
    await prisma.taskWatcher.upsert({
      where: {
        taskId_userId: { taskId, userId }
      },
      create: { taskId, userId },
      update: {}
    });

    // Log user activity
    await prisma.userActivityLog.create({
      data: {
        userId,
        activityType: ActivityType.COMMENT,
        entityType: 'TaskComment',
        entityId: comment.id,
        teamId: task.teamId,
        ipAddress: auditContext?.ipAddress,
        metadata: {
          taskId: task.id,
          taskNumber: task.taskNumber
        }
      }
    });

    return comment;
  }

  async listComments(taskId: string) {
    const comments = await prisma.taskComment.findMany({
      where: {
        taskId,
        isDeleted: false
      },
      orderBy: { createdAt: 'asc' },
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

    return comments;
  }

  async updateComment(commentId: string, userId: string, input: UpdateCommentInput) {
    const comment = await prisma.taskComment.findUnique({
      where: { id: commentId }
    });

    if (!comment || comment.isDeleted) {
      throw new NotFoundError('Comment not found');
    }

    if (comment.userId !== userId) {
      throw new ForbiddenError('You can only edit your own comments');
    }

    const updated = await prisma.taskComment.update({
      where: { id: commentId },
      data: {
        content: input.content,
        isEdited: true
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

    return updated;
  }

  async deleteComment(commentId: string, userId: string) {
    const comment = await prisma.taskComment.findUnique({
      where: { id: commentId }
    });

    if (!comment || comment.isDeleted) {
      throw new NotFoundError('Comment not found');
    }

    if (comment.userId !== userId) {
      throw new ForbiddenError('You can only delete your own comments');
    }

    await prisma.taskComment.update({
      where: { id: commentId },
      data: {
        isDeleted: true,
        deletedAt: new Date()
      }
    });

    return { message: 'Comment deleted successfully' };
  }
}

export const commentService = new CommentService();
