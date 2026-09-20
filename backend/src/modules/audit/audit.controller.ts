import { Request, Response, NextFunction } from 'express';
import { auditService } from './audit.service';
import { sendSuccess, sendCreated } from '../../shared/utils/response.util';
import { FilterAuditLogsQuery } from './audit.schema';

export class AuditController {
  async getAuditLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await auditService.getAuditLogs(req.query as unknown as FilterAuditLogsQuery);
      return sendSuccess(res, result.items, 'Audit logs retrieved', 200, result.pagination);
    } catch (error) {
      next(error);
    }
  }

  async getAuditLogById(req: Request, res: Response, next: NextFunction) {
    try {
      const log = await auditService.getAuditLogById(req.params.id);
      return sendSuccess(res, log);
    } catch (error) {
      next(error);
    }
  }

  async getEntityHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const { entityType, entityId } = req.params;
      const history = await auditService.getEntityHistory(entityType, entityId);
      return sendSuccess(res, history, `History for ${entityType} ${entityId}`);
    } catch (error) {
      next(error);
    }
  }

  async getRetentionPolicies(req: Request, res: Response, next: NextFunction) {
    try {
      const policies = await auditService.getRetentionPolicies();
      return sendSuccess(res, policies, 'Audit retention policies retrieved');
    } catch (error) {
      next(error);
    }
  }

  async upsertRetentionPolicy(req: Request, res: Response, next: NextFunction) {
    try {
      const policy = await auditService.upsertRetentionPolicy(req.body);
      return sendCreated(res, policy, 'Retention policy saved successfully');
    } catch (error) {
      next(error);
    }
  }

  async updateRetentionPolicy(req: Request, res: Response, next: NextFunction) {
    try {
      const updated = await auditService.updateRetentionPolicy(req.params.id, req.body);
      return sendSuccess(res, updated, 'Retention policy updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async applyRetentionPolicies(req: Request, res: Response, next: NextFunction) {
    try {
      const results = await auditService.applyRetentionPolicies();
      return sendSuccess(res, results, 'Retention policies applied');
    } catch (error) {
      next(error);
    }
  }
}

export const auditController = new AuditController();
