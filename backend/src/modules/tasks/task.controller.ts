import { Request, Response, NextFunction } from 'express';
import { taskService } from './task.service';
import { sendCreated, sendSuccess } from '../../shared/utils/response.util';
import { UnauthorizedError, BadRequestError } from '../../shared/errors/app-error';

export class TaskController {
  async createTask(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const task = await taskService.createTask(req.user.id, req.body, req.auditContext);
      return sendCreated(res, task, 'Task created successfully');
    } catch (error) {
      next(error);
    }
  }

  async listTasks(req: Request, res: Response, next: NextFunction) {
    try {
      const clientId = (req.query.clientId as string) || (req.headers['X-Client-Id'] as string);
      const result = await taskService.listTasks(clientId, req.query as any);
      return sendSuccess(res, result.items, 'Tasks retrieved', 200, result.pagination);
    } catch (error) {
      next(error);
    }
  }

  async getTaskById(req: Request, res: Response, next: NextFunction) {
    try {
      const clientId = (req.query.clientId as string) || (req.headers['X-Client-Id'] as string);
      const task = await taskService.getTaskById(req.params.taskId, clientId);
      return sendSuccess(res, task);
    } catch (error) {
      next(error);
    }
  }

  async updateTask(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const task = await taskService.updateTask(
        req.params.taskId,
        req.user.id,
        req.body,
        req.user.roles,
        req.auditContext
      );
      return sendSuccess(res, task, 'Task updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async approveTask(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const task = await taskService.approveTask(req.params.taskId, req.user.id, req.auditContext);
      return sendSuccess(res, task, 'Task approved successfully');
    } catch (error) {
      next(error);
    }
  }

  async requestChanges(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const task = await taskService.requestChanges(
        req.params.taskId,
        req.user.id,
        req.body.reason,
        req.auditContext
      );
      return sendSuccess(res, task, 'Changes requested on task');
    } catch (error) {
      next(error);
    }
  }

  async reorderTask(req: Request, res: Response, next: NextFunction) {
    try {
      const clientId = (req.body.clientId as string) || (req.headers['X-Client-Id'] as string) || (req.query.clientId as string);
      const task = await taskService.reorderTask(clientId, req.body);
      return sendSuccess(res, task, 'Task reordered successfully');
    } catch (error) {
      next(error);
    }
  }

  async deleteTask(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const result = await taskService.deleteTask(req.params.taskId, req.user.id, req.auditContext);
      return sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async addWatcher(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.body.userId || (req.user ? req.user.id : undefined);
      const watcher = await taskService.addWatcher(req.params.taskId, userId);
      return sendCreated(res, watcher, 'Watcher added to task');
    } catch (error) {
      next(error);
    }
  }

  async addSubtask(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const subtask = await taskService.addSubtask(req.params.taskId, req.user.id, req.body, req.auditContext);
      return sendCreated(res, subtask, 'Subtask added successfully');
    } catch (error) {
      next(error);
    }
  }

  async removeWatcher(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.params.userId || (req.user ? req.user.id : undefined);
      if (!userId) throw new BadRequestError('User ID required to remove watcher');
      const result = await taskService.removeWatcher(req.params.taskId, userId);
      return sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }
}

export const taskController = new TaskController();
