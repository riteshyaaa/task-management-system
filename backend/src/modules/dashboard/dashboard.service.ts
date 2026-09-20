import { Prisma, TaskStatus, TaskPriority } from '@prisma/client';
import { prisma } from '../../config/database';
import { startOfDay, endOfDay, addDays } from 'date-fns';

export class DashboardService {
  /**
   * Returns an overview matching the frontend DashboardOverviewData shape:
   *   { counts, priorityDistribution, recentActivities }
   */
  async getOverview(userId: string, teamId?: string) {
    const now = new Date();
    const dueSoonCutoff = addDays(now, 3);

    const baseWhere: Prisma.TaskWhereInput = {
      isDeleted: false,
      ...(teamId ? { teamId } : {}),
    };

    const [
      totalCount,
      todoCount,
      inProgressCount,
      reviewCount,
      doneCount,
      overdueCount,
      dueSoonCount,
      lowCount,
      mediumCount,
      highCount,
      urgentCount,
      recentActivities
    ] = await Promise.all([
      prisma.task.count({ where: baseWhere }),
      prisma.task.count({ where: { ...baseWhere, status: TaskStatus.TODO } }),
      prisma.task.count({ where: { ...baseWhere, status: TaskStatus.IN_PROGRESS } }),
      prisma.task.count({ where: { ...baseWhere, status: TaskStatus.REVIEW } }),
      prisma.task.count({ where: { ...baseWhere, status: TaskStatus.DONE } }),
      prisma.task.count({
        where: {
          ...baseWhere,
          status: { not: TaskStatus.DONE },
          dueDate: { lt: now },
        },
      }),
      prisma.task.count({
        where: {
          ...baseWhere,
          status: { not: TaskStatus.DONE },
          dueDate: { gte: now, lte: dueSoonCutoff },
        },
      }),
      prisma.task.count({ where: { ...baseWhere, priority: TaskPriority.LOW } }),
      prisma.task.count({ where: { ...baseWhere, priority: TaskPriority.MEDIUM } }),
      prisma.task.count({ where: { ...baseWhere, priority: TaskPriority.HIGH } }),
      prisma.task.count({ where: { ...baseWhere, priority: TaskPriority.URGENT } }),
      prisma.userActivityLog.findMany({
        where: {
          ...(teamId ? { teamId } : { userId }),
        },
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { firstName: true, lastName: true, email: true },
          },
        },
      }),
    ]);

    return {
      overview: {
        counts: {
          total: totalCount,
          todo: todoCount,
          inProgress: inProgressCount,
          review: reviewCount,
          done: doneCount,
          overdue: overdueCount,
          dueSoon: dueSoonCount,
        },
        priorityDistribution: {
          LOW: lowCount,
          MEDIUM: mediumCount,
          HIGH: highCount,
          URGENT: urgentCount,
        },
        recentActivities: recentActivities.map((a) => ({
          id: a.id.toString(),
          action: a.activityType,
          entityType: a.entityType || 'UNKNOWN',
          timestamp: a.createdAt.toISOString(),
          performedBy: a.user
            ? { firstName: a.user.firstName, lastName: a.user.lastName, email: a.user.email }
            : undefined,
        })),
      },
    };
  }

  /**
   * Returns dashboard widgets for a user, wrapped in { widgets: [...] }
   */
  async getWidgets(userId: string) {
    const widgets = await prisma.dashboardWidget.findMany({
      where: { userId },
      orderBy: [{ gridY: 'asc' }, { gridX: 'asc' }],
    });

    return { widgets };
  }
}

export const dashboardService = new DashboardService();
