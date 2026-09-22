import { apiClient } from './api.client';
import { client, clientMember } from '../types/client.types';

export const clientService = {
  async getmyClients(): Promise<client[]> {
    const response = await apiClient.get<{ success: boolean; data: client[] }>('/clients');
    return response.data.data || [];
  },

  async getTeamById(clientId: string): Promise<client> {
    const response = await apiClient.get<{ success: boolean; data: client }>(`/Clients/${clientId}`);
    return response.data.data;
  },

  async createClient(payload: { name: string; description?: string }): Promise<client> {
    const response = await apiClient.post<{ success: boolean; data: client }>('/clients', payload);
    return response.data.data;
  },

  async getclientMembers(clientId: string): Promise<clientMember[]> {
    const response = await apiClient.get<{ success: boolean; data: clientMember[] }>(`/Clients/${clientId}/members`);
    return response.data.data || [];
  },

  async addclientMember(clientId: string, payload: { email: string; role: string }): Promise<clientMember> {
    const response = await apiClient.post<{ success: boolean; data: clientMember }>(`/Clients/${clientId}/members`, payload);
    return response.data.data;
  },

  async removeclientMember(clientId: string, memberId: string): Promise<void> {
    await apiClient.delete(`/Clients/${clientId}/members/${memberId}`);
  },
};
