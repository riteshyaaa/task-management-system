import { Router } from 'express';
import { dashboardController } from './dashboard.controller';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/overview', dashboardController.getOverview);
router.get('/widgets', dashboardController.getWidgets);

export default router;
