import { Request, Response, NextFunction } from 'express';
import { clientService } from './client.service';
import { sendCreated, sendSuccess } from '../../shared/utils/response.util';
import { UnauthorizedError } from '../../shared/errors/app-error';

export class ClientController {
  async createClient(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const client = await clientService.createClient(req.user.id, req.body);
      return sendCreated(res, client, 'Client created successfully');
    } catch (error) {
      next(error);
    }
  }

  async listUserClients(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const clients = await clientService.listUserClients(req.user.id);
      return sendSuccess(res, clients);
    } catch (error) {
      next(error);
    }
  }

  async getClientById(req: Request, res: Response, next: NextFunction) {
    try {
      const client = await clientService.getClientById(req.params.clientId);
      return sendSuccess(res, client);
    } catch (error) {
      next(error);
    }
  }

  async getClientMembers(req: Request, res: Response, next: NextFunction) {
    try {
      const members = await clientService.getClientMembers(req.params.clientId);
      return sendSuccess(res, members);
    } catch (error) {
      next(error);
    }
  }

  async updateClient(req: Request, res: Response, next: NextFunction) {
    try {
      const client = await clientService.updateClient(req.params.clientId, req.body);
      return sendSuccess(res, client, 'Client updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async archiveClient(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await clientService.archiveClient(req.params.clientId);
      return sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async addMember(req: Request, res: Response, next: NextFunction) {
    try {
      const member = await clientService.addMember(req.params.clientId, req.body);
      return sendCreated(res, member, 'Member added to client');
    } catch (error) {
      next(error);
    }
  }

  async updateMemberRole(req: Request, res: Response, next: NextFunction) {
    try {
      const member = await clientService.updateMemberRole(req.params.clientId, req.params.userId, req.body);
      return sendSuccess(res, member, 'Member role updated');
    } catch (error) {
      next(error);
    }
  }

  async removeMember(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await clientService.removeMember(req.params.clientId, req.params.userId);
      return sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }
}

export const clientController = new ClientController();
