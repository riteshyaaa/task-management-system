import { apiClient } from './api.client';
import { LeaderboardUser, LoginStreak, TaskVelocityMetric, TeamPerformanceSummary } from '../types/engagement.types';

export const engagementService = {
  async getStreak(): Promise<LoginStreak> {
    const response = await apiClient.get<{ success: boolean; data: LoginStreak }>('/engagement/streak');
    return response.data.data;
  },

  async getLeaderboard(clientId?: string): Promise<LeaderboardUser[]> {
    const response = await apiClient.get<{ success: boolean; data: LeaderboardUser[] }>('/engagement/leaderboard', {
      params: { clientId },
    });
    return response.data.data || [];
  },

  async getVelocityMetrics(clientId: string): Promise<TaskVelocityMetric[]> {
    const response = await apiClient.get<{ success: boolean; data: TaskVelocityMetric[] }>(`/engagement/velocity/${clientId}`);
    return response.data.data || [];
  },

  async getTeamSummary(clientId: string): Promise<TeamPerformanceSummary> {
    const response = await apiClient.get<{ success: boolean; data: TeamPerformanceSummary }>(`/engagement/Clients/${clientId}/summary`);
    return response.data.data;
  },
};
