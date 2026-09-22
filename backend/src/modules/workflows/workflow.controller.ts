import { Request, Response, NextFunction } from 'express';
import { workflowService } from './workflow.service';
import { sendCreated, sendSuccess } from '../../shared/utils/response.util';
import { UnauthorizedError } from '../../shared/errors/app-error';

export class WorkflowController {
  async createWorkflow(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const workflow = await workflowService.createWorkflow(req.user.id, req.body);
      return sendCreated(res, workflow, 'Workflow definition created successfully');
    } catch (error) {
      next(error);
    }
  }

  async listWorkflows(req: Request, res: Response, next: NextFunction) {
    try {
      const clientId = req.query.clientId as string;
      const workflows = await workflowService.listWorkflows(clientId);
      return sendSuccess(res, workflows);
    } catch (error) {
      next(error);
    }
  }

  async getWorkflowById(req: Request, res: Response, next: NextFunction) {
    try {
      const workflow = await workflowService.getWorkflowById(req.params.workflowId);
      return sendSuccess(res, workflow);
    } catch (error) {
      next(error);
    }
  }

  async updateWorkflow(req: Request, res: Response, next: NextFunction) {
    try {
      const workflow = await workflowService.updateWorkflow(req.params.workflowId, req.body);
      return sendSuccess(res, workflow, 'Workflow updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async assignWorkflowToTask(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const assignment = await workflowService.assignWorkflowToTask(
        req.params.taskId,
        req.body.workflowId,
        req.user.id
      );
      return sendSuccess(res, assignment, 'Workflow assigned to task');
    } catch (error) {
      next(error);
    }
  }

  async getTaskWorkflowState(req: Request, res: Response, next: NextFunction) {
    try {
      const state = await workflowService.getTaskWorkflowState(req.params.taskId);
      return sendSuccess(res, state);
    } catch (error) {
      next(error);
    }
  }

  async transitionTask(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const result = await workflowService.transitionTask(
        req.params.taskId,
        req.body,
        req.user.id,
        req.auditContext
      );
      return sendSuccess(res, result, 'Task transitioned successfully');
    } catch (error) {
      next(error);
    }
  }
}

export const workflowController = new WorkflowController();
