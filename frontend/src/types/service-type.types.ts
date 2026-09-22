export type RecurrenceFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY' | 'CUSTOM_CRON';

export interface ServiceType {
  id: string;
  name: string;
  description?: string | null;
  defaultCadence: RecurrenceFrequency;
  estimatedHours?: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    engagements?: number;
    templates?: number;
  };
}

export interface CreateServiceTypePayload {
  name: string;
  description?: string | null;
  defaultCadence?: RecurrenceFrequency;
  estimatedHours?: number | null;
  isActive?: boolean;
}

export interface UpdateServiceTypePayload {
  name?: string;
  description?: string | null;
  defaultCadence?: RecurrenceFrequency;
  estimatedHours?: number | null;
  isActive?: boolean;
}

export interface FilterServiceTypesParams {
  isActive?: boolean | string;
  search?: string;
  page?: number;
  limit?: number;
}
