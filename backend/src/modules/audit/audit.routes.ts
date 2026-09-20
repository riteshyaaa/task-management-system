import { Router } from 'express';
import { auditController } from './audit.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';
import { validate } from '../../middleware/validate.middleware';
import {
  filterAuditLogsQuerySchema,
  retentionPolicySchema,
  updateRetentionPolicySchema
} from './audit.schema';

const router = Router();

router.use(authenticate);

// Audit query endpoints
router.get(
  '/',
  requirePermission('audit:read'),
  validate({ query: filterAuditLogsQuerySchema }),
  auditController.getAuditLogs
);

router.get(
  '/entity/:entityType/:entityId',
  requirePermission('audit:read'),
  auditController.getEntityHistory
);

router.get(
  '/retention-policies',
  requirePermission('audit:read'),
  auditController.getRetentionPolicies
);

router.post(
  '/retention-policies',
  requirePermission('system:settings'),
  validate({ body: retentionPolicySchema }),
  auditController.upsertRetentionPolicy
);

router.patch(
  '/retention-policies/:id',
  requirePermission('system:settings'),
  validate({ body: updateRetentionPolicySchema }),
  auditController.updateRetentionPolicy
);

router.post(
  '/retention-policies/apply',
  requirePermission('system:settings'),
  auditController.applyRetentionPolicies
);

router.get(
  '/:id',
  requirePermission('audit:read'),
  auditController.getAuditLogById
);

export default router;
