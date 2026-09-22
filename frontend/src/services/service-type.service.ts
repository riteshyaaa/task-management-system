import { apiClient } from './api.client';
import {
  ServiceType,
  CreateServiceTypePayload,
  UpdateServiceTypePayload,
  FilterServiceTypesParams
} from '../types/service-type.types';

export const serviceTypeService = {
  async listServiceTypes(params?: FilterServiceTypesParams): Promise<{ items: ServiceType[]; pagination: any }> {
    const response = await apiClient.get<{ success: boolean; data: { items: ServiceType[]; pagination: any } | ServiceType[] }>(
      '/service-types',
      { params }
    );
    if (Array.isArray(response.data.data)) {
      return { items: response.data.data, pagination: { total: response.data.data.length, page: 1, limit: 50 } };
    }
    return response.data.data || { items: [], pagination: { total: 0, page: 1, limit: 50 } };
  },

  async getServiceTypeById(id: string): Promise<ServiceType> {
    const response = await apiClient.get<{ success: boolean; data: ServiceType }>(`/service-types/${id}`);
    return response.data.data;
  },

  async createServiceType(payload: CreateServiceTypePayload): Promise<ServiceType> {
    const response = await apiClient.post<{ success: boolean; data: ServiceType }>('/service-types', payload);
    return response.data.data;
  },

  async updateServiceType(id: string, payload: UpdateServiceTypePayload): Promise<ServiceType> {
    const response = await apiClient.patch<{ success: boolean; data: ServiceType }>(`/service-types/${id}`, payload);
    return response.data.data;
  },

  async deleteServiceType(id: string): Promise<void> {
    await apiClient.delete(`/service-types/${id}`);
  }
};
