import { Request, Response, NextFunction } from 'express';
import { recurringService } from './recurring.service';
import { sendCreated, sendSuccess } from '../../shared/utils/response.util';
import { UnauthorizedError } from '../../shared/errors/app-error';

export class RecurringController {
  async createRecurrenceRule(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const rule = await recurringService.createRecurrenceRule(req.user.id, req.body);
      return sendCreated(res, rule, 'Recurrence rule created successfully');
    } catch (error) {
      next(error);
    }
  }

  async getRecurrenceRuleById(req: Request, res: Response, next: NextFunction) {
    try {
      const rule = await recurringService.getRecurrenceRuleById(req.params.ruleId);
      return sendSuccess(res, rule);
    } catch (error) {
      next(error);
    }
  }

  async listRecurrenceRules(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await recurringService.listRecurrenceRules(req.query as any);
      return sendSuccess(res, result.items, 'Recurrence rules retrieved', 200, result.pagination);
    } catch (error) {
      next(error);
    }
  }

  async updateRecurrenceRule(req: Request, res: Response, next: NextFunction) {
    try {
      const updated = await recurringService.updateRecurrenceRule(req.params.ruleId, req.body);
      return sendSuccess(res, updated, 'Recurrence rule updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async pauseRecurrenceRule(req: Request, res: Response, next: NextFunction) {
    try {
      const rule = await recurringService.pauseRecurrenceRule(req.params.ruleId);
      return sendSuccess(res, rule, 'Recurrence rule paused');
    } catch (error) {
      next(error);
    }
  }

  async resumeRecurrenceRule(req: Request, res: Response, next: NextFunction) {
    try {
      const rule = await recurringService.resumeRecurrenceRule(req.params.ruleId);
      return sendSuccess(res, rule, 'Recurrence rule resumed');
    } catch (error) {
      next(error);
    }
  }

  async cancelRecurrenceRule(req: Request, res: Response, next: NextFunction) {
    try {
      const rule = await recurringService.cancelRecurrenceRule(req.params.ruleId);
      return sendSuccess(res, rule, 'Recurrence rule cancelled');
    } catch (error) {
      next(error);
    }
  }

  async addExceptionDate(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const exception = await recurringService.addExceptionDate(
        req.params.ruleId,
        req.body,
        req.user.id
      );
      return sendCreated(res, exception, 'Exception date added');
    } catch (error) {
      next(error);
    }
  }

  async removeExceptionDate(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await recurringService.removeExceptionDate(
        req.params.ruleId,
        req.params.exceptionDate
      );
      return sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async triggerManually(req: Request, res: Response, next: NextFunction) {
    try {
      const taskId = await recurringService.spawnInstance(req.params.ruleId);
      return sendCreated(res, { taskId }, 'Task instance generated manually');
    } catch (error) {
      next(error);
    }
  }
}

export const recurringController = new RecurringController();
