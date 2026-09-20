import { Request, Response, NextFunction } from 'express';
import { commentService } from './comment.service';
import { sendCreated, sendSuccess } from '../../shared/utils/response.util';
import { UnauthorizedError } from '../../shared/errors/app-error';

export class CommentController {
  async addComment(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const comment = await commentService.addComment(req.params.taskId, req.user.id, req.body, req.auditContext);
      return sendCreated(res, comment, 'Comment added successfully');
    } catch (error) {
      next(error);
    }
  }

  async listComments(req: Request, res: Response, next: NextFunction) {
    try {
      const comments = await commentService.listComments(req.params.taskId);
      return sendSuccess(res, comments);
    } catch (error) {
      next(error);
    }
  }

  async updateComment(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const comment = await commentService.updateComment(req.params.commentId, req.user.id, req.body);
      return sendSuccess(res, comment, 'Comment updated');
    } catch (error) {
      next(error);
    }
  }

  async deleteComment(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const result = await commentService.deleteComment(req.params.commentId, req.user.id);
      return sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }
}

export const commentController = new CommentController();
