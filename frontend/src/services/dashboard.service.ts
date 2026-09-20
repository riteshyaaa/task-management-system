import { apiClient } from './api.client';
import { DashboardOverviewData, DashboardWidget } from '../types/dashboard.types';

export const dashboardService = {
  async getOverview(teamId?: string): Promise<DashboardOverviewData> {
    const response = await apiClient.get<{ success: boolean; data: any }>('/dashboard/overview', {
      params: { teamId },
    });
    const data = response.data.data;
    return data?.overview || data || {
      counts: { total: 0, todo: 0, inProgress: 0, review: 0, done: 0, overdue: 0, dueSoon: 0 },
      priorityDistribution: { LOW: 0, MEDIUM: 0, HIGH: 0, URGENT: 0 },
      recentActivities: [],
    };
  },

  async getWidgets(teamId?: string): Promise<DashboardWidget[]> {
    const response = await apiClient.get<{ success: boolean; data: any }>('/dashboard/widgets', {
      params: { teamId },
    });
    const data = response.data.data;
    if (Array.isArray(data)) return data;
    return data?.widgets || [];
  },

  async saveWidgets(widgets: Partial<DashboardWidget>[], teamId?: string): Promise<DashboardWidget[]> {
    const response = await apiClient.put<{ success: boolean; data: any }>('/dashboard/widgets', {
      widgets,
      teamId,
    });
    const data = response.data.data;
    if (Array.isArray(data)) return data;
    return data?.widgets || [];
  },
};
