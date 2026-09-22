import { Prisma, TaskStatus, TaskPriority, EngagementStatus } from '@prisma/client';
import { prisma } from '../../config/database';
import { startOfDay, endOfDay, addDays, startOfMonth, endOfMonth } from 'date-fns';

export class DashboardService {
  /**
   * Returns an overview matching both frontend DashboardOverviewData shape
   * and comprehensive Professional Services Engagement metrics.
   */
  async getOverview(userId: string, clientId?: string) {
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const dueSoonCutoff = addDays(now, 3);

    const baseWhere: Prisma.TaskWhereInput = {
      isDeleted: false,
      ...(clientId ? { clientId } : {}),
    };

    const notCompletedStatusList = [
      TaskStatus.COMPLETED,
      TaskStatus.DONE
    ];

    const completedStatusList = [
      TaskStatus.COMPLETED,
      TaskStatus.DONE
    ];

    const reviewStatusList = [
      TaskStatus.READY_FOR_REVIEW,
      TaskStatus.REVIEW
    ];

    const [
      totalCount,
      todoCount,
      inProgressCount,
      reviewCount,
      doneCount,
      overdueCount,
      dueSoonCount,
      dueTodayCount,
      openCount,
      waitingForClientCount,
      waitingForReviewCount,
      completedThisPeriodCount,
      engagementsInProgressCount,
      totalEngagementsCount,
      lowCount,
      mediumCount,
      highCount,
      urgentCount,
      recentActivities
    ] = await Promise.all([
      prisma.task.count({ where: baseWhere }),
      prisma.task.count({ where: { ...baseWhere, status: { in: [TaskStatus.TODO, TaskStatus.NOT_STARTED] } } }),
      prisma.task.count({ where: { ...baseWhere, status: TaskStatus.IN_PROGRESS } }),
      prisma.task.count({ where: { ...baseWhere, status: { in: reviewStatusList } } }),
      prisma.task.count({ where: { ...baseWhere, status: { in: completedStatusList } } }),
      prisma.task.count({
        where: {
          ...baseWhere,
          status: { notIn: notCompletedStatusList },
          dueDate: { lt: now },
        },
      }),
      prisma.task.count({
        where: {
          ...baseWhere,
          status: { notIn: notCompletedStatusList },
          dueDate: { gte: now, lte: dueSoonCutoff },
        },
      }),
      prisma.task.count({
        where: {
          ...baseWhere,
          status: { notIn: notCompletedStatusList },
          dueDate: { gte: todayStart, lte: todayEnd },
        },
      }),
      prisma.task.count({
        where: {
          ...baseWhere,
          status: { notIn: notCompletedStatusList },
        },
      }),
      prisma.task.count({
        where: {
          ...baseWhere,
          status: TaskStatus.WAITING_FOR_CLIENT,
        },
      }),
      prisma.task.count({
        where: {
          ...baseWhere,
          status: { in: reviewStatusList },
        },
      }),
      prisma.task.count({
        where: {
          ...baseWhere,
          status: { in: completedStatusList },
          OR: [
            { completedAt: { gte: monthStart, lte: monthEnd } },
            { updatedAt: { gte: monthStart, lte: monthEnd } }
          ]
        },
      }),
      prisma.engagement.count({
        where: {
          ...(clientId ? { clientId } : {}),
          status: EngagementStatus.ACTIVE
        }
      }),
      prisma.engagement.count({
        where: {
          ...(clientId ? { clientId } : {})
        }
      }),
      prisma.task.count({ where: { ...baseWhere, priority: TaskPriority.LOW } }),
      prisma.task.count({ where: { ...baseWhere, priority: TaskPriority.MEDIUM } }),
      prisma.task.count({ where: { ...baseWhere, priority: TaskPriority.HIGH } }),
      prisma.task.count({ where: { ...baseWhere, priority: TaskPriority.URGENT } }),
      prisma.userActivityLog.findMany({
        where: {
          ...(clientId ? { clientId } : { userId }),
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
          dueToday: dueTodayCount,
          open: openCount,
          waitingForClient: waitingForClientCount,
          waitingForReview: waitingForReviewCount,
          completedThisPeriod: completedThisPeriodCount,
          engagementsInProgress: engagementsInProgressCount,
          totalEngagements: totalEngagementsCount,
        },
        metrics: {
          openTasks: openCount,
          overdueTasks: overdueCount,
          dueToday: dueTodayCount,
          waitingForClient: waitingForClientCount,
          waitingForReview: waitingForReviewCount,
          completedThisPeriod: completedThisPeriodCount,
          engagementsInProgress: engagementsInProgressCount,
          totalEngagements: totalEngagementsCount,
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
