import { TaskPriority } from './task.types';

export interface TemplateItem {
  id: string;
  templateId: string;
  title: string;
  description?: string | null;
  position: number;
  estimatedHours?: number | null;
}

export interface TaskTemplate {
  id: string;
  clientId: string;
  name: string;
  description?: string | null;
  defaultTitle: string;
  defaultBody?: string | null;
  defaultPriority: TaskPriority;
  estimatedHours?: number | null;
  variables: { name: string; label: string; defaultValue?: string; required?: boolean }[];
  templateItems: TemplateItem[];
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export type RuleTriggerType = 'TASK_CREATED' | 'TASK_STATUS_CHANGED' | 'TASK_ASSIGNED' | 'TASK_DUE_SOON' | 'TASK_OVERDUE';
export type RuleActionType = 'UPDATE_STATUS' | 'ASSIGN_USER' | 'ADD_LABEL' | 'SEND_NOTIFICATION' | 'CREATE_SUBTASKS';

export interface AutomationRule {
  id: string;
  clientId: string;
  name: string;
  description?: string | null;
  triggerType: RuleTriggerType;
  triggerConfig: Record<string, any>;
  conditions: { field: string; operator: string; value: any }[];
  actions: { type: RuleActionType; config: Record<string, any> }[];
  isActive: boolean;
  executionCount: number;
  lastTriggeredAt?: string | null;
  createdAt: string;
  updatedAt: string;
}
