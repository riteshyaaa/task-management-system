import { Request, Response, NextFunction } from 'express';
import { userService } from './user.service';
import { sendSuccess } from '../../shared/utils/response.util';

export class UserController {
  async listUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await userService.listUsers(req.query as any);
      return sendSuccess(res, result.users, undefined, 200, result.meta);
    } catch (error) {
      next(error);
    }
  }

  async getUserById(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await userService.getUserById(req.params.id);
      return sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async updateUser(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await userService.updateUser(req.params.id, req.body);
      return sendSuccess(res, result, 'User updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async assignRoles(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await userService.assignRoles(req.params.id, req.body);
      return sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async deleteUser(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await userService.deleteUser(req.params.id);
      return sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }
}

export const userController = new UserController();
