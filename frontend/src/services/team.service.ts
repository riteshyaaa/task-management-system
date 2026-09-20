import { apiClient } from './api.client';
import { Team, TeamMember } from '../types/team.types';

export const teamService = {
  async getMyTeams(): Promise<Team[]> {
    const response = await apiClient.get<{ success: boolean; data: Team[] }>('/teams');
    return response.data.data || [];
  },

  async getTeamById(teamId: string): Promise<Team> {
    const response = await apiClient.get<{ success: boolean; data: Team }>(`/teams/${teamId}`);
    return response.data.data;
  },

  async createTeam(payload: { name: string; description?: string }): Promise<Team> {
    const response = await apiClient.post<{ success: boolean; data: Team }>('/teams', payload);
    return response.data.data;
  },

  async getTeamMembers(teamId: string): Promise<TeamMember[]> {
    const response = await apiClient.get<{ success: boolean; data: TeamMember[] }>(`/teams/${teamId}/members`);
    return response.data.data || [];
  },

  async addTeamMember(teamId: string, payload: { email: string; role: string }): Promise<TeamMember> {
    const response = await apiClient.post<{ success: boolean; data: TeamMember }>(`/teams/${teamId}/members`, payload);
    return response.data.data;
  },

  async removeTeamMember(teamId: string, memberId: string): Promise<void> {
    await apiClient.delete(`/teams/${teamId}/members/${memberId}`);
  },
};
