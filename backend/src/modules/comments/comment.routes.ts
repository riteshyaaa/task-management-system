import { Router } from 'express';
import { commentController } from './comment.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';
import { validate } from '../../middleware/validate.middleware';
import { createCommentSchema, updateCommentSchema } from './comment.schema';

const router = Router({ mergeParams: true });

router.use(authenticate);

// Nested under /api/v1/tasks/:taskId/comments
router.post(
  '/',
  requirePermission('comments:create'),
  validate({ body: createCommentSchema }),
  commentController.addComment
);

router.get(
  '/',
  requirePermission('comments:read'),
  commentController.listComments
);

// Individual comment routes
router.patch(
  '/:commentId',
  requirePermission('comments:update'),
  validate({ body: updateCommentSchema }),
  commentController.updateComment
);

router.delete(
  '/:commentId',
  requirePermission('comments:delete'),
  commentController.deleteComment
);

export default router;
