import { apiClient } from './api.client';
import { AutomationRule, TaskTemplate } from '../types/template.types';

export const templateService = {
  async getTemplates(clientId: string): Promise<TaskTemplate[]> {
    const response = await apiClient.get<{ success: boolean; data: TaskTemplate[] }>('/templates', {
      params: { clientId },
    });
    return response.data.data || [];
  },

  async createTemplate(payload: any): Promise<TaskTemplate> {
    const response = await apiClient.post<{ success: boolean; data: TaskTemplate }>('/templates', payload);
    return response.data.data;
  },

  async instantiateTemplate(
    templateId: string,
    payload: {
      clientId: string;
      variables?: Record<string, string>;
      assigneeId?: string;
      dueDate?: string;
    }
  ): Promise<any> {
    const response = await apiClient.post<{ success: boolean; data: any }>(`/templates/${templateId}/instantiate`, payload);
    return response.data.data;
  },

  // Automation Rules
  async getAutomationRules(clientId: string): Promise<AutomationRule[]> {
    const response = await apiClient.get<{ success: boolean; data: AutomationRule[] }>('/automation-rules', {
      params: { clientId },
    });
    return response.data.data || [];
  },

  async createAutomationRule(payload: any): Promise<AutomationRule> {
    const response = await apiClient.post<{ success: boolean; data: AutomationRule }>('/automation-rules', payload);
    return response.data.data;
  },

  async toggleAutomationRule(ruleId: string, isActive: boolean): Promise<AutomationRule> {
    const response = await apiClient.patch<{ success: boolean; data: AutomationRule }>(`/automation-rules/${ruleId}`, {
      isActive,
    });
    return response.data.data;
  },
};
