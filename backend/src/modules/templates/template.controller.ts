import { Request, Response, NextFunction } from 'express';
import { templateService } from './template.service';
import { sendCreated, sendSuccess } from '../../shared/utils/response.util';
import { UnauthorizedError } from '../../shared/errors/app-error';

export class TemplateController {
  async createTemplate(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const template = await templateService.createTemplate(req.user.id, req.body);
      return sendCreated(res, template, 'Task template created successfully');
    } catch (error) {
      next(error);
    }
  }

  async listTemplates(req: Request, res: Response, next: NextFunction) {
    try {
      const teamId = req.query.teamId as string;
      const templates = await templateService.listTemplates(teamId);
      return sendSuccess(res, templates);
    } catch (error) {
      next(error);
    }
  }

  async getTemplateById(req: Request, res: Response, next: NextFunction) {
    try {
      const template = await templateService.getTemplateById(req.params.templateId);
      return sendSuccess(res, template);
    } catch (error) {
      next(error);
    }
  }

  async updateTemplate(req: Request, res: Response, next: NextFunction) {
    try {
      const template = await templateService.updateTemplate(req.params.templateId, req.body);
      return sendSuccess(res, template, 'Task template updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async deleteTemplate(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await templateService.deleteTemplate(req.params.templateId);
      return sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async instantiateTemplate(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const task = await templateService.instantiateTemplate(
        req.params.templateId,
        req.user.id,
        req.body,
        req.auditContext
      );
      return sendCreated(res, task, 'Task generated from template successfully');
    } catch (error) {
      next(error);
    }
  }
}

export const templateController = new TemplateController();
