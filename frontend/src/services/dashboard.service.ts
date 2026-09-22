import { apiClient } from './api.client';
import { DashboardOverviewData, DashboardWidget } from '../types/dashboard.types';

export const dashboardService = {
  async getOverview(clientId?: string): Promise<DashboardOverviewData> {
    const response = await apiClient.get<{ success: boolean; data: any }>('/dashboard/overview', {
      params: { clientId },
    });
    const data = response.data.data;
    return data?.overview || data || {
      counts: { total: 0, todo: 0, inProgress: 0, review: 0, done: 0, overdue: 0, dueSoon: 0 },
      priorityDistribution: { LOW: 0, MEDIUM: 0, HIGH: 0, URGENT: 0 },
      recentActivities: [],
    };
  },

  async getWidgets(clientId?: string): Promise<DashboardWidget[]> {
    const response = await apiClient.get<{ success: boolean; data: any }>('/dashboard/widgets', {
      params: { clientId },
    });
    const data = response.data.data;
    if (Array.isArray(data)) return data;
    return data?.widgets || [];
  },

  async saveWidgets(widgets: Partial<DashboardWidget>[], clientId?: string): Promise<DashboardWidget[]> {
    const response = await apiClient.put<{ success: boolean; data: any }>('/dashboard/widgets', {
      widgets,
      clientId,
    });
    const data = response.data.data;
    if (Array.isArray(data)) return data;
    return data?.widgets || [];
  },
};
