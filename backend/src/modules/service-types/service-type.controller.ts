import { Request, Response, NextFunction } from 'express';
import { serviceTypeService } from './service-type.service';
import { sendCreated, sendSuccess } from '../../shared/utils/response.util';

export class ServiceTypeController {
  async createServiceType(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await serviceTypeService.createServiceType(req.body);
      return sendCreated(res, result, 'Service type created successfully');
    } catch (error) {
      next(error);
    }
  }

  async listServiceTypes(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await serviceTypeService.listServiceTypes(req.query as any);
      return sendSuccess(res, result.items, 'Service types retrieved', 200, result.pagination);
    } catch (error) {
      next(error);
    }
  }

  async getServiceTypeById(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await serviceTypeService.getServiceTypeById(req.params.id);
      return sendSuccess(res, result, 'Service type retrieved');
    } catch (error) {
      next(error);
    }
  }

  async updateServiceType(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await serviceTypeService.updateServiceType(req.params.id, req.body);
      return sendSuccess(res, result, 'Service type updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async deleteServiceType(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await serviceTypeService.deleteServiceType(req.params.id);
      return sendSuccess(res, result, 'Service type deleted or deactivated successfully');
    } catch (error) {
      next(error);
    }
  }
}

export const serviceTypeController = new ServiceTypeController();
