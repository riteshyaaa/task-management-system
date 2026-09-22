import { apiClient } from './api.client';
import { CreateTaskPayload, Task, TaskComment, UpdateTaskPayload } from '../types/task.types';

export interface TaskQueryParams {
  clientId: string;
  status?: string;
  priority?: string;
  assigneeId?: string;
  engagementId?: string;
  search?: string;
  parentTaskId?: string | null;
  page?: number;
  limit?: number;
}

export const taskService = {
  async getTasks(params: TaskQueryParams): Promise<{ tasks: Task[]; total: number; page: number; limit: number }> {
    const response = await apiClient.get<{ success: boolean; data: Task[]; meta?: { total: number; page: number; limit: number } }>('/tasks', {
      params,
    });
    const tasks = Array.isArray(response.data.data) ? response.data.data : [];
    return {
      tasks,
      total: response.data.meta?.total ?? tasks.length,
      page: response.data.meta?.page ?? 1,
      limit: response.data.meta?.limit ?? 100,
    };
  },

  async getTaskById(taskId: string): Promise<Task> {
    const response = await apiClient.get<{ success: boolean; data: Task }>(`/tasks/${taskId}`);
    return response.data.data;
  },

  async createTask(clientId: string, payload: CreateTaskPayload): Promise<Task> {
    const response = await apiClient.post<{ success: boolean; data: Task }>('/tasks', {
      ...payload,
      clientId,
    });
    return response.data.data;
  },

  async updateTask(taskId: string, payload: UpdateTaskPayload): Promise<Task> {
    const response = await apiClient.patch<{ success: boolean; data: Task }>(`/tasks/${taskId}`, payload);
    return response.data.data;
  },

  async approveTask(taskId: string): Promise<Task> {
    const response = await apiClient.post<{ success: boolean; data: Task }>(`/tasks/${taskId}/approve`);
    return response.data.data;
  },

  async requestChanges(taskId: string, reason: string): Promise<Task> {
    const response = await apiClient.post<{ success: boolean; data: Task }>(`/tasks/${taskId}/request-changes`, {
      reason,
    });
    return response.data.data;
  },

  async deleteTask(taskId: string): Promise<void> {
    await apiClient.delete(`/tasks/${taskId}`);
  },

  async reorderTasks(clientId: string, taskIds: string[]): Promise<void> {
    await apiClient.post('/tasks/reorder', { clientId, taskIds });
  },

  // Subtasks
  async addSubtask(taskId: string, payload: { title: string; priority?: string }): Promise<any> {
    const response = await apiClient.post<{ success: boolean; data: any }>(`/tasks/${taskId}/subtasks`, payload);
    return response.data.data;
  },

  async updateSubtask(taskId: string, subtaskId: string, payload: any): Promise<any> {
    const response = await apiClient.patch<{ success: boolean; data: any }>(`/tasks/${taskId}/subtasks/${subtaskId}`, payload);
    return response.data.data;
  },

  // Comments
  async getComments(taskId: string): Promise<TaskComment[]> {
    const response = await apiClient.get<{ success: boolean; data: TaskComment[] }>(`/tasks/${taskId}/comments`);
    return response.data.data || [];
  },

  async addComment(taskId: string, content: string): Promise<TaskComment> {
    const response = await apiClient.post<{ success: boolean; data: TaskComment }>(`/tasks/${taskId}/comments`, {
      content,
    });
    return response.data.data;
  },
};
