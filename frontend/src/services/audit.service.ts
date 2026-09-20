import { apiClient } from './api.client';
import { AuditLog, AuditQueryParams } from '../types/audit.types';

export const auditService = {
  async getAuditLogs(params: AuditQueryParams): Promise<{ logs: AuditLog[]; total: number; page: number; limit: number }> {
    const response = await apiClient.get<{ success: boolean; data: AuditLog[]; meta?: { total: number; page: number; limit: number } }>('/audit', {
      params,
    });
    const logs = Array.isArray(response.data.data) ? response.data.data : [];
    return {
      logs,
      total: response.data.meta?.total ?? logs.length,
      page: response.data.meta?.page ?? 1,
      limit: response.data.meta?.limit ?? 50,
    };
  },

  async getEntityAuditHistory(entityType: string, entityId: string): Promise<AuditLog[]> {
    const response = await apiClient.get<{ success: boolean; data: AuditLog[] }>(`/audit/entity/${entityType}/${entityId}`);
    return response.data.data || [];
  },
};
