import { apiClient } from './api.client';
import {
  Engagement,
  CreateEngagementPayload,
  UpdateEngagementPayload,
  FilterEngagementsParams,
  LeaderboardUser,
  LoginStreak,
  TaskVelocityMetric,
  TeamPerformanceSummary
} from '../types/engagement.types';

export const engagementService = {
  // --- Professional Services Engagements ---
  async listEngagements(params?: FilterEngagementsParams): Promise<{ items: Engagement[]; pagination: any }> {
    const response = await apiClient.get<{
      success: boolean;
      data: { items: Engagement[]; pagination: any } | Engagement[];
    }>('/engagements', { params });
    if (Array.isArray(response.data.data)) {
      return { items: response.data.data, pagination: { total: response.data.data.length, page: 1, limit: 50 } };
    }
    return response.data.data || { items: [], pagination: { total: 0, page: 1, limit: 50 } };
  },

  async getEngagementById(id: string): Promise<Engagement> {
    const response = await apiClient.get<{ success: boolean; data: Engagement }>(`/engagements/${id}`);
    return response.data.data;
  },

  async createEngagement(payload: CreateEngagementPayload): Promise<Engagement> {
    const response = await apiClient.post<{ success: boolean; data: Engagement }>('/engagements', payload);
    return response.data.data;
  },

  async updateEngagement(id: string, payload: UpdateEngagementPayload): Promise<Engagement> {
    const response = await apiClient.patch<{ success: boolean; data: Engagement }>(`/engagements/${id}`, payload);
    return response.data.data;
  },

  async deleteEngagement(id: string): Promise<void> {
    await apiClient.delete(`/engagements/${id}`);
  },

  // --- Gamification & Activity Engagement ---
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
