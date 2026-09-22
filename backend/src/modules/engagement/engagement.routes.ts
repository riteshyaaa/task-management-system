import { Router } from 'express';
import { engagementController } from './engagement.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';
import { validate } from '../../middleware/validate.middleware';
import {
  recordActivitySchema,
  filterActivityLogsQuerySchema,
  velocityQuerySchema,
  performanceQuerySchema,
  createDashboardWidgetSchema,
  updateDashboardWidgetSchema,
  batchUpdateWidgetsSchema
} from './engagement.schema';

const router = Router();

router.use(authenticate);

// Activity logs & streaks
router.post(
  '/activities',
  validate({ body: recordActivitySchema }),
  engagementController.recordActivity
);

router.get(
  '/activities',
  requirePermission('analytics:read'),
  validate({ query: filterActivityLogsQuerySchema }),
  engagementController.getActivityLogs
);

router.get('/streak', engagementController.getUserStreak);

router.get('/leaderboard', engagementController.getLeaderboard);

// Velocity & Performance
router.get(
  '/velocity',
  requirePermission('analytics:read'),
  validate({ query: velocityQuerySchema }),
  engagementController.getVelocityMetrics
);

router.post(
  '/velocity/compute',
  requirePermission('analytics:read'),
  engagementController.computeVelocityMetrics
);

router.get(
  '/performance',
  requirePermission('analytics:read'),
  validate({ query: performanceQuerySchema }),
  engagementController.getclientPerformanceMetrics
);

router.post(
  '/performance/compute',
  requirePermission('analytics:read'),
  engagementController.computeTeamPerformance
);

// Dashboard Summary & Widgets
router.get('/summary', engagementController.getDashboardSummary);

router.get('/widgets', engagementController.getUserWidgets);

router.post(
  '/widgets',
  validate({ body: createDashboardWidgetSchema }),
  engagementController.createWidget
);

router.put(
  '/widgets/batch',
  validate({ body: batchUpdateWidgetsSchema }),
  engagementController.batchUpdateWidgets
);

router.patch(
  '/widgets/:id',
  validate({ body: updateDashboardWidgetSchema }),
  engagementController.updateWidget
);

router.delete('/widgets/:id', engagementController.deleteWidget);

export default router;
