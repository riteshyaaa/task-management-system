import { apiClient } from './api.client';
import { LeaderboardUser, LoginStreak, TaskVelocityMetric, TeamPerformanceSummary } from '../types/engagement.types';

export const engagementService = {
  async getStreak(): Promise<LoginStreak> {
    const response = await apiClient.get<{ success: boolean; data: LoginStreak }>('/engagement/streak');
    return response.data.data;
  },

  async getLeaderboard(teamId?: string): Promise<LeaderboardUser[]> {
    const response = await apiClient.get<{ success: boolean; data: LeaderboardUser[] }>('/engagement/leaderboard', {
      params: { teamId },
    });
    return response.data.data || [];
  },

  async getVelocityMetrics(teamId: string): Promise<TaskVelocityMetric[]> {
    const response = await apiClient.get<{ success: boolean; data: TaskVelocityMetric[] }>(`/engagement/velocity/${teamId}`);
    return response.data.data || [];
  },

  async getTeamSummary(teamId: string): Promise<TeamPerformanceSummary> {
    const response = await apiClient.get<{ success: boolean; data: TeamPerformanceSummary }>(`/engagement/teams/${teamId}/summary`);
    return response.data.data;
  },
};
