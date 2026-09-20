import { Request, Response, NextFunction } from 'express';
import { engagementService } from './engagement.service';
import { sendSuccess, sendCreated } from '../../shared/utils/response.util';
import { UnauthorizedError } from '../../shared/errors/app-error';
import { FilterActivityLogsQuery, VelocityQuery, PerformanceQuery } from './engagement.schema';

export class EngagementController {
  async recordActivity(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const ipAddress = req.ip || (req.headers['x-forwarded-for'] as string);
      const result = await engagementService.recordActivity(req.user.id, req.body, ipAddress);
      return sendCreated(res, result, 'Activity recorded');
    } catch (error) {
      next(error);
    }
  }

  async getUserStreak(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const streak = await engagementService.getUserStreak(req.user.id);
      return sendSuccess(res, streak);
    } catch (error) {
      next(error);
    }
  }

  async getActivityLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await engagementService.getActivityLogs(req.query as unknown as FilterActivityLogsQuery);
      return sendSuccess(res, result.items, 'Activity logs retrieved', 200, result.pagination);
    } catch (error) {
      next(error);
    }
  }

  async getLeaderboard(req: Request, res: Response, next: NextFunction) {
    try {
      const teamId = req.query.teamId as string | undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
      const leaderboard = await engagementService.getLeaderboard(teamId, limit);
      return sendSuccess(res, leaderboard, 'Leaderboard retrieved');
    } catch (error) {
      next(error);
    }
  }

  async getVelocityMetrics(req: Request, res: Response, next: NextFunction) {
    try {
      const { teamId, periodType, limit } = req.query as unknown as VelocityQuery;
      const metrics = await engagementService.getVelocityMetrics(teamId, periodType, limit);
      return sendSuccess(res, metrics, 'Velocity metrics retrieved');
    } catch (error) {
      next(error);
    }
  }

  async computeVelocityMetrics(req: Request, res: Response, next: NextFunction) {
    try {
      const { teamId, periodType, periodStart } = req.body;
      const metric = await engagementService.computeVelocityMetrics(
        teamId,
        periodType,
        periodStart ? new Date(periodStart) : undefined
      );
      return sendCreated(res, metric, 'Velocity metric computed and recorded');
    } catch (error) {
      next(error);
    }
  }

  async getTeamPerformanceMetrics(req: Request, res: Response, next: NextFunction) {
    try {
      const { teamId, periodType, userId } = req.query as unknown as PerformanceQuery;
      const metrics = await engagementService.getTeamPerformanceMetrics(teamId, periodType, userId);
      return sendSuccess(res, metrics, 'Team performance metrics retrieved');
    } catch (error) {
      next(error);
    }
  }

  async computeTeamPerformance(req: Request, res: Response, next: NextFunction) {
    try {
      const { teamId, periodType, periodStart } = req.body;
      const metrics = await engagementService.computeTeamPerformance(
        teamId,
        periodType,
        periodStart ? new Date(periodStart) : undefined
      );
      return sendCreated(res, metrics, 'Team performance metrics computed and recorded');
    } catch (error) {
      next(error);
    }
  }

  async getDashboardSummary(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const teamId = req.query.teamId as string | undefined;
      const summary = await engagementService.getDashboardSummary(req.user.id, teamId);
      return sendSuccess(res, summary, 'Dashboard summary retrieved');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Widgets
   */
  async getUserWidgets(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const widgets = await engagementService.getUserWidgets(req.user.id);
      return sendSuccess(res, widgets, 'Dashboard widgets retrieved');
    } catch (error) {
      next(error);
    }
  }

  async createWidget(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const widget = await engagementService.createWidget(req.user.id, req.body);
      return sendCreated(res, widget, 'Dashboard widget created');
    } catch (error) {
      next(error);
    }
  }

  async updateWidget(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const updated = await engagementService.updateWidget(req.user.id, req.params.id, req.body);
      return sendSuccess(res, updated, 'Dashboard widget updated');
    } catch (error) {
      next(error);
    }
  }

  async batchUpdateWidgets(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const result = await engagementService.batchUpdateWidgets(req.user.id, req.body);
      return sendSuccess(res, result, 'Dashboard widgets layout updated');
    } catch (error) {
      next(error);
    }
  }

  async deleteWidget(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const result = await engagementService.deleteWidget(req.user.id, req.params.id);
      return sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }
}

export const engagementController = new EngagementController();
