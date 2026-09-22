import { Request, Response, NextFunction } from 'express';
import { automationService } from './automation.service';
import { sendCreated, sendSuccess } from '../../shared/utils/response.util';
import { UnauthorizedError } from '../../shared/errors/app-error';

export class AutomationController {
  async createRule(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const rule = await automationService.createRule(req.user.id, req.body);
      return sendCreated(res, rule, 'Automation rule created successfully');
    } catch (error) {
      next(error);
    }
  }

  async listRules(req: Request, res: Response, next: NextFunction) {
    try {
      const clientId = req.query.clientId as string;
      const rules = await automationService.listRules(clientId);
      return sendSuccess(res, rules);
    } catch (error) {
      next(error);
    }
  }

  async getRuleById(req: Request, res: Response, next: NextFunction) {
    try {
      const rule = await automationService.getRuleById(req.params.ruleId);
      return sendSuccess(res, rule);
    } catch (error) {
      next(error);
    }
  }

  async updateRule(req: Request, res: Response, next: NextFunction) {
    try {
      const rule = await automationService.updateRule(req.params.ruleId, req.body);
      return sendSuccess(res, rule, 'Automation rule updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async deleteRule(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await automationService.deleteRule(req.params.ruleId);
      return sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async testTriggerRule(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await automationService.testTriggerRule(req.params.ruleId, req.body);
      return sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }
}

export const automationController = new AutomationController();
