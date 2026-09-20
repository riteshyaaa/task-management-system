import { apiClient } from './api.client';
import { TransitionHistoryItem, WorkflowDefinition } from '../types/workflow.types';

export const workflowService = {
  async getWorkflows(teamId: string): Promise<WorkflowDefinition[]> {
    const response = await apiClient.get<{ success: boolean; data: WorkflowDefinition[] }>(`/workflows`, {
      params: { teamId },
    });
    return response.data.data || [];
  },

  async getWorkflowById(workflowId: string): Promise<WorkflowDefinition> {
    const response = await apiClient.get<{ success: boolean; data: WorkflowDefinition }>(`/workflows/${workflowId}`);
    return response.data.data;
  },

  async createWorkflow(payload: {
    teamId: string;
    name: string;
    description?: string;
    states: { name: string; color: string; isInitial?: boolean; isTerminal?: boolean; positionX?: number; positionY?: number }[];
    transitions: { name: string; fromStateName: string; toStateName: string; requiredRole?: string }[];
  }): Promise<WorkflowDefinition> {
    const response = await apiClient.post<{ success: boolean; data: WorkflowDefinition }>('/workflows', payload);
    return response.data.data;
  },

  async executeTransition(
    workflowId: string,
    payload: {
      taskId: string;
      toStateId: string;
    }
  ): Promise<any> {
    const response = await apiClient.post<{ success: boolean; data: any }>(`/workflows/${workflowId}/transition`, payload);
    return response.data.data;
  },

  async getTransitionHistory(taskId: string): Promise<TransitionHistoryItem[]> {
    const response = await apiClient.get<{ success: boolean; data: TransitionHistoryItem[] }>(`/workflows/tasks/${taskId}/history`);
    return response.data.data || [];
  },
};
