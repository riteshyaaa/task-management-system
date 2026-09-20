import { ActivityType, MetricPeriod, Prisma, TaskStatus } from '@prisma/client';
import { prisma } from '../../config/database';
import { StreakCalculator } from './streak-calculator';
import {
  RecordActivityInput,
  FilterActivityLogsQuery,
  CreateDashboardWidgetInput,
  UpdateDashboardWidgetInput,
  BatchUpdateWidgetsInput
} from './engagement.schema';
import { NotFoundError } from '../../shared/errors/app-error';
import { startOfDay, endOfDay, subDays, startOfWeek, endOfWeek, subWeeks, format } from 'date-fns';

export class EngagementService {
  /**
   * Records a user activity event and updates their login streak
   */
  async recordActivity(userId: string, input: RecordActivityInput, ipAddress?: string) {
    const activity = await prisma.userActivityLog.create({
      data: {
        userId,
        activityType: input.activityType,
        entityType: input.entityType,
        entityId: input.entityId,
        teamId: input.teamId,
        metadata: input.metadata as Prisma.InputJsonValue,
        sessionId: input.sessionId,
        ipAddress
      }
    });

    // Update login streak asynchronously
    const streak = await StreakCalculator.recordUserActivity(userId);

    return {
      activity: {
        ...activity,
        id: activity.id.toString()
      },
      streak
    };
  }

  /**
   * Retrieves the current user's login streak
   */
  async getUserStreak(userId: string) {
    let streak = await prisma.userLoginStreak.findUnique({
      where: { userId }
    });

    if (!streak) {
      streak = await prisma.userLoginStreak.create({
        data: {
          userId,
          currentStreak: 0,
          longestStreak: 0,
          totalActiveDays: 0,
          lastActiveDate: new Date()
        }
      });
    }

    return streak;
  }

  /**
   * Queries user activity logs with pagination and filters
   */
  async getActivityLogs(query: FilterActivityLogsQuery) {
    const { userId, teamId, activityType, entityType, startDate, endDate, page, limit } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.UserActivityLogWhereInput = {
      ...(userId && { userId }),
      ...(teamId && { teamId }),
      ...(activityType && { activityType }),
      ...(entityType && { entityType }),
      ...(startDate || endDate
        ? {
            createdAt: {
              ...(startDate && { gte: new Date(startDate) }),
              ...(endDate && { lte: new Date(endDate) })
            }
          }
        : {})
    };

    const [total, items] = await Promise.all([
      prisma.userActivityLog.count({ where }),
      prisma.userActivityLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true }
          }
        }
      })
    ]);

    return {
      items: items.map((item) => ({
        ...item,
        id: item.id.toString()
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Engagement leaderboard (Streaks + Active Days + Tasks Completed)
   */
  async getLeaderboard(teamId?: string, limit: number = 10) {
    // If teamId is specified, restrict to users in that team
    let userFilter: Prisma.UserWhereInput = { isActive: true };
    if (teamId) {
      userFilter = {
        isActive: true,
        teamMembers: {
          some: { teamId }
        }
      };
    }

    const streaks = await prisma.userLoginStreak.findMany({
      where: {
        user: userFilter
      },
      orderBy: [{ currentStreak: 'desc' }, { totalActiveDays: 'desc' }],
      take: limit,
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true }
        }
      }
    });

    const userIds = streaks.map((s) => s.userId);
    const completedCounts = await prisma.task.groupBy({
      by: ['assigneeId'],
      where: {
        assigneeId: { in: userIds },
        status: TaskStatus.DONE,
        isDeleted: false,
        ...(teamId ? { teamId } : {})
      },
      _count: { id: true }
    });

    const completedMap = new Map<string, number>();
    for (const c of completedCounts) {
      if (c.assigneeId) completedMap.set(c.assigneeId, c._count.id);
    }

    return streaks.map((s) => {
      const tasksCompleted = completedMap.get(s.userId) || 0;
      const score = tasksCompleted * 100 + (s.currentStreak || 0) * 20 + (s.totalActiveDays || 0) * 10;
      return {
        id: s.user.id,
        streakId: s.id,
        firstName: s.user.firstName || '',
        lastName: s.user.lastName || '',
        email: s.user.email || '',
        avatarUrl: s.user.avatarUrl,
        currentStreak: s.currentStreak || 0,
        longestStreak: s.longestStreak || 0,
        totalActiveDays: s.totalActiveDays || 0,
        tasksCompleted,
        score,
        user: s.user
      };
    });
  }

  /**
   * Computes and persists weekly/monthly task velocity for a team
   */
  async computeVelocityMetrics(teamId: string, periodType: MetricPeriod = MetricPeriod.WEEKLY, periodStart?: Date) {
    const start = periodStart ? startOfDay(periodStart) : startOfWeek(new Date(), { weekStartsOn: 1 });
    const end = periodType === MetricPeriod.WEEKLY ? endOfWeek(start, { weekStartsOn: 1 }) : endOfDay(new Date());

    // 1. Tasks created in this period
    const tasksCreated = await prisma.task.count({
      where: {
        teamId,
        createdAt: { gte: start, lte: end }
      }
    });

    // 2. Tasks completed in this period
    const completedTasks = await prisma.task.findMany({
      where: {
        teamId,
        status: TaskStatus.DONE,
        updatedAt: { gte: start, lte: end }
      },
      select: {
        id: true,
        createdAt: true,
        updatedAt: true,
        dueDate: true
      }
    });

    const tasksCompleted = completedTasks.length;

    // 3. Tasks overdue in this period
    const now = new Date();
    const tasksOverdue = await prisma.task.count({
      where: {
        teamId,
        status: { not: TaskStatus.DONE },
        dueDate: { lt: now, gte: start }
      }
    });

    // 4. Calculate cycle time (hours from creation to completion)
    let avgCycleTimeHrs: number | null = null;
    let p50CycleTimeHrs: number | null = null;
    let p90CycleTimeHrs: number | null = null;

    if (completedTasks.length > 0) {
      const cycleTimes = completedTasks
        .map((t) => (t.updatedAt.getTime() - t.createdAt.getTime()) / (1000 * 60 * 60))
        .sort((a, b) => a - b);

      const totalCycle = cycleTimes.reduce((acc, curr) => acc + curr, 0);
      avgCycleTimeHrs = Number((totalCycle / cycleTimes.length).toFixed(2));

      const p50Index = Math.floor(cycleTimes.length * 0.5);
      const p90Index = Math.floor(cycleTimes.length * 0.9);
      p50CycleTimeHrs = Number(cycleTimes[p50Index].toFixed(2));
      p90CycleTimeHrs = Number(cycleTimes[p90Index].toFixed(2));
    }

    const throughputRate = tasksCompleted;

    // 5. Upsert metric in database
    const metric = await prisma.taskVelocityMetric.upsert({
      where: {
        teamId_periodType_periodStart: {
          teamId,
          periodType,
          periodStart: start
        }
      },
      create: {
        teamId,
        periodType,
        periodStart: start,
        tasksCreated,
        tasksCompleted,
        tasksOverdue,
        avgCycleTimeHrs,
        p50CycleTimeHrs,
        p90CycleTimeHrs,
        throughputRate
      },
      update: {
        tasksCreated,
        tasksCompleted,
        tasksOverdue,
        avgCycleTimeHrs,
        p50CycleTimeHrs,
        p90CycleTimeHrs,
        throughputRate,
        computedAt: new Date()
      }
    });

    return metric;
  }

  /**
   * Retrieves historical velocity metrics for a team
   */
  async getVelocityMetrics(teamId: string, periodType: MetricPeriod = MetricPeriod.WEEKLY, limit: number = 12) {
    return prisma.taskVelocityMetric.findMany({
      where: {
        teamId,
        periodType
      },
      orderBy: { periodStart: 'desc' },
      take: limit
    });
  }

  /**
   * Computes individual team member performance metrics
   */
  async computeTeamPerformance(teamId: string, periodType: MetricPeriod = MetricPeriod.WEEKLY, periodStart?: Date) {
    const start = periodStart ? startOfDay(periodStart) : startOfWeek(new Date(), { weekStartsOn: 1 });
    const end = periodType === MetricPeriod.WEEKLY ? endOfWeek(start, { weekStartsOn: 1 }) : endOfDay(new Date());

    const members = await prisma.teamMember.findMany({
      where: { teamId },
      select: { userId: true }
    });

    const results = [];

    for (const { userId } of members) {
      // Assigned
      const tasksAssigned = await prisma.task.count({
        where: { teamId, assigneeId: userId }
      });

      // Completed in period
      const completed = await prisma.task.findMany({
        where: {
          teamId,
          assigneeId: userId,
          status: TaskStatus.DONE,
          updatedAt: { gte: start, lte: end }
        },
        select: { createdAt: true, updatedAt: true, dueDate: true }
      });

      const tasksCompleted = completed.length;

      // Overdue
      const now = new Date();
      const tasksOverdue = await prisma.task.count({
        where: {
          teamId,
          assigneeId: userId,
          status: { not: TaskStatus.DONE },
          dueDate: { lt: now }
        }
      });

      // Avg completion hours
      let avgCompletionHrs: number | null = null;
      let onTimePercentage: number | null = null;

      if (completed.length > 0) {
        const totalDuration = completed.reduce(
          (sum, t) => sum + (t.updatedAt.getTime() - t.createdAt.getTime()) / (1000 * 60 * 60),
          0
        );
        avgCompletionHrs = Number((totalDuration / completed.length).toFixed(2));

        const onTimeCount = completed.filter((t) => !t.dueDate || t.updatedAt <= t.dueDate).length;
        onTimePercentage = Number(((onTimeCount / completed.length) * 100).toFixed(2));
      }

      // Comments posted
      const commentsPosted = await prisma.taskComment.count({
        where: {
          userId,
          createdAt: { gte: start, lte: end },
          task: { teamId }
        }
      });

      // Save metric
      const metric = await prisma.teamPerformanceMetric.upsert({
        where: {
          userId_teamId_periodType_periodStart: {
            userId,
            teamId,
            periodType,
            periodStart: start
          }
        },
        create: {
          userId,
          teamId,
          periodType,
          periodStart: start,
          tasksAssigned,
          tasksCompleted,
          tasksOverdue,
          avgCompletionHrs,
          onTimePercentage,
          commentsPosted
        },
        update: {
          tasksAssigned,
          tasksCompleted,
          tasksOverdue,
          avgCompletionHrs,
          onTimePercentage,
          commentsPosted,
          computedAt: new Date()
        }
      });

      results.push(metric);
    }

    return results;
  }

  /**
   * Retrieves member performance metrics for a team
   */
  async getTeamPerformanceMetrics(
    teamId: string,
    periodType: MetricPeriod = MetricPeriod.WEEKLY,
    userId?: string
  ) {
    return prisma.teamPerformanceMetric.findMany({
      where: {
        teamId,
        periodType,
        ...(userId && { userId })
      },
      orderBy: { periodStart: 'desc' },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true }
        }
      }
    });
  }

  /**
   * Unified dashboard summary stats for a user and optional team
   */
  async getDashboardSummary(userId: string, teamId?: string) {
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);

    const baseWhere: Prisma.TaskWhereInput = {
      isDeleted: false,
      ...(teamId ? { teamId } : {})
    };

    const [
      myTodoCount,
      myInProgressCount,
      myInReviewCount,
      myDoneCount,
      dueTodayCount,
      overdueCount,
      totalTeamTasks,
      streak,
      recentActivities,
      recentVelocity
    ] = await Promise.all([
      prisma.task.count({ where: { ...baseWhere, assigneeId: userId, status: TaskStatus.TODO } }),
      prisma.task.count({ where: { ...baseWhere, assigneeId: userId, status: TaskStatus.IN_PROGRESS } }),
      prisma.task.count({ where: { ...baseWhere, assigneeId: userId, status: TaskStatus.REVIEW } }),
      prisma.task.count({ where: { ...baseWhere, assigneeId: userId, status: TaskStatus.DONE } }),
      prisma.task.count({
        where: {
          ...baseWhere,
          assigneeId: userId,
          dueDate: { gte: todayStart, lte: todayEnd },
          status: { not: TaskStatus.DONE }
        }
      }),
      prisma.task.count({
        where: {
          ...baseWhere,
          assigneeId: userId,
          dueDate: { lt: now },
          status: { not: TaskStatus.DONE }
        }
      }),
      teamId ? prisma.task.count({ where: { teamId, isDeleted: false } }) : 0,
      this.getUserStreak(userId),
      prisma.userActivityLog.findMany({
        where: {
          ...(teamId ? { teamId } : { userId })
        },
        take: 8,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, avatarUrl: true }
          }
        }
      }),
      teamId
        ? prisma.taskVelocityMetric.findMany({
            where: { teamId, periodType: MetricPeriod.WEEKLY },
            orderBy: { periodStart: 'desc' },
            take: 4
          })
        : []
    ]);

    return {
      tasks: {
        myTotal: myTodoCount + myInProgressCount + myInReviewCount + myDoneCount,
        todo: myTodoCount,
        inProgress: myInProgressCount,
        inReview: myInReviewCount,
        done: myDoneCount,
        dueToday: dueTodayCount,
        overdue: overdueCount,
        teamTotal: totalTeamTasks
      },
      streak,
      recentActivities: recentActivities.map((a) => ({
        ...a,
        id: a.id.toString()
      })),
      recentVelocity
    };
  }

  /**
   * Dashboard Widget Management
   */
  async getUserWidgets(userId: string) {
    return prisma.dashboardWidget.findMany({
      where: { userId },
      orderBy: [{ gridY: 'asc' }, { gridX: 'asc' }]
    });
  }

  async createWidget(userId: string, input: CreateDashboardWidgetInput) {
    return prisma.dashboardWidget.create({
      data: {
        userId,
        widgetType: input.widgetType,
        title: input.title,
        config: input.config as Prisma.InputJsonValue,
        gridX: input.gridX,
        gridY: input.gridY,
        gridW: input.gridW,
        gridH: input.gridH,
        isVisible: input.isVisible
      }
    });
  }

  async updateWidget(userId: string, widgetId: string, input: UpdateDashboardWidgetInput) {
    const existing = await prisma.dashboardWidget.findFirst({
      where: { id: widgetId, userId }
    });

    if (!existing) throw new NotFoundError('Dashboard widget not found');

    return prisma.dashboardWidget.update({
      where: { id: widgetId },
      data: {
        ...input,
        config: input.config ? (input.config as Prisma.InputJsonValue) : undefined
      }
    });
  }

  async batchUpdateWidgets(userId: string, input: BatchUpdateWidgetsInput) {
    return prisma.$transaction(
      input.widgets.map((widget) =>
        prisma.dashboardWidget.updateMany({
          where: { id: widget.id, userId },
          data: {
            gridX: widget.gridX,
            gridY: widget.gridY,
            gridW: widget.gridW,
            gridH: widget.gridH,
            ...(widget.isVisible !== undefined ? { isVisible: widget.isVisible } : {})
          }
        })
      )
    );
  }

  async deleteWidget(userId: string, widgetId: string) {
    const existing = await prisma.dashboardWidget.findFirst({
      where: { id: widgetId, userId }
    });

    if (!existing) throw new NotFoundError('Dashboard widget not found');

    await prisma.dashboardWidget.delete({
      where: { id: widgetId }
    });

    return { success: true, message: 'Widget deleted successfully' };
  }
}

export const engagementService = new EngagementService();
