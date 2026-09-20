import { Request, Response, NextFunction } from 'express';
import { teamService } from './team.service';
import { sendCreated, sendSuccess } from '../../shared/utils/response.util';
import { UnauthorizedError } from '../../shared/errors/app-error';

export class TeamController {
  async createTeam(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const team = await teamService.createTeam(req.user.id, req.body);
      return sendCreated(res, team, 'Team created successfully');
    } catch (error) {
      next(error);
    }
  }

  async listUserTeams(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const teams = await teamService.listUserTeams(req.user.id);
      return sendSuccess(res, teams);
    } catch (error) {
      next(error);
    }
  }

  async getTeamById(req: Request, res: Response, next: NextFunction) {
    try {
      const team = await teamService.getTeamById(req.params.teamId);
      return sendSuccess(res, team);
    } catch (error) {
      next(error);
    }
  }

  async getTeamMembers(req: Request, res: Response, next: NextFunction) {
    try {
      const members = await teamService.getTeamMembers(req.params.teamId);
      return sendSuccess(res, members);
    } catch (error) {
      next(error);
    }
  }

  async updateTeam(req: Request, res: Response, next: NextFunction) {
    try {
      const team = await teamService.updateTeam(req.params.teamId, req.body);
      return sendSuccess(res, team, 'Team updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async archiveTeam(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await teamService.archiveTeam(req.params.teamId);
      return sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async addMember(req: Request, res: Response, next: NextFunction) {
    try {
      const member = await teamService.addMember(req.params.teamId, req.body);
      return sendCreated(res, member, 'Member added to team');
    } catch (error) {
      next(error);
    }
  }

  async updateMemberRole(req: Request, res: Response, next: NextFunction) {
    try {
      const member = await teamService.updateMemberRole(req.params.teamId, req.params.userId, req.body);
      return sendSuccess(res, member, 'Member role updated');
    } catch (error) {
      next(error);
    }
  }

  async removeMember(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await teamService.removeMember(req.params.teamId, req.params.userId);
      return sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }
}

export const teamController = new TeamController();
