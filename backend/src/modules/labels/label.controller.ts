import { Request, Response, NextFunction } from 'express';
import { labelService } from './label.service';
import { sendCreated, sendSuccess } from '../../shared/utils/response.util';

export class LabelController {
  async createLabel(req: Request, res: Response, next: NextFunction) {
    try {
      const label = await labelService.createLabel(req.body);
      return sendCreated(res, label, 'Label created successfully');
    } catch (error) {
      next(error);
    }
  }

  async listLabels(req: Request, res: Response, next: NextFunction) {
    try {
      const clientId = req.query.clientId as string;
      const labels = await labelService.listLabels(clientId);
      return sendSuccess(res, labels);
    } catch (error) {
      next(error);
    }
  }

  async updateLabel(req: Request, res: Response, next: NextFunction) {
    try {
      const label = await labelService.updateLabel(req.params.labelId, req.body);
      return sendSuccess(res, label, 'Label updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async deleteLabel(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await labelService.deleteLabel(req.params.labelId);
      return sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }
}

export const labelController = new LabelController();
