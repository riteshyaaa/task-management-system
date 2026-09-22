import { Request, Response, NextFunction } from 'express';
import { dashboardService } from './dashboard.service';
import { sendSuccess } from '../../shared/utils/response.util';
import { UnauthorizedError } from '../../shared/errors/app-error';

export class DashboardController {
  async getOverview(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const clientId = req.query.clientId as string | undefined;
      const data = await dashboardService.getOverview(req.user.id, clientId);
      return sendSuccess(res, data, 'Dashboard overview retrieved');
    } catch (error) {
      next(error);
    }
  }

  async getWidgets(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const data = await dashboardService.getWidgets(req.user.id);
      return sendSuccess(res, data, 'Dashboard widgets retrieved');
    } catch (error) {
      next(error);
    }
  }
}

export const dashboardController = new DashboardController();
