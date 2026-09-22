import { Request, Response, NextFunction } from 'express';
import { engagementService } from './engagement.service';
import { sendCreated, sendSuccess } from '../../shared/utils/response.util';

export class EngagementController {
  async createEngagement(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await engagementService.createEngagement(req.user!.id, req.body);
      return sendCreated(res, result, 'Engagement created successfully with associated tasks');
    } catch (error) {
      next(error);
    }
  }

  async listEngagements(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await engagementService.listEngagements(req.query as any);
      return sendSuccess(res, result, 'Engagements retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async getEngagementById(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await engagementService.getEngagementById(req.params.id);
      return sendSuccess(res, result, 'Engagement details retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async updateEngagement(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await engagementService.updateEngagement(req.params.id, req.body);
      return sendSuccess(res, result, 'Engagement updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async deleteEngagement(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await engagementService.deleteEngagement(req.params.id);
      return sendSuccess(res, result, 'Engagement deleted successfully');
    } catch (error) {
      next(error);
    }
  }
}

export const engagementController = new EngagementController();
