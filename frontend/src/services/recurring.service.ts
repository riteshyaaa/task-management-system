import { apiClient } from './api.client';
import { RecurrenceRule } from '../types/recurring.types';

export const recurringService = {
  async getRecurrenceRules(clientId?: string): Promise<RecurrenceRule[]> {
    const response = await apiClient.get<{ success: boolean; data: RecurrenceRule[] }>('/recurring', {
      params: { clientId },
    });
    return response.data.data || [];
  },

  async getRuleById(ruleId: string): Promise<RecurrenceRule> {
    const response = await apiClient.get<{ success: boolean; data: RecurrenceRule }>(`/recurring/${ruleId}`);
    return response.data.data;
  },

  async createRecurrenceRule(payload: any): Promise<RecurrenceRule> {
    const response = await apiClient.post<{ success: boolean; data: RecurrenceRule }>('/recurring', payload);
    return response.data.data;
  },

  async toggleRecurrenceRule(ruleId: string, isActive: boolean): Promise<RecurrenceRule> {
    const response = await apiClient.patch<{ success: boolean; data: RecurrenceRule }>(`/recurring/${ruleId}`, {
      isActive,
    });
    return response.data.data;
  },

  async triggerRuleManually(ruleId: string): Promise<any> {
    const response = await apiClient.post<{ success: boolean; data: any }>(`/recurring/${ruleId}/trigger`);
    return response.data.data;
  },
};
