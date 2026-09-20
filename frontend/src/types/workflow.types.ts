export type WorkflowStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
export type TransitionConditionType = 'ROLE_CHECK' | 'FIELD_VALUE' | 'APPROVAL_COUNT' | 'CUSTOM_SCRIPT' | 'TIME_ELAPSED';
export type HookEventType = 'NOTIFY_ASSIGNEE' | 'NOTIFY_CHANNEL' | 'WEBHOOK' | 'CREATE_SUBTASKS' | 'UPDATE_FIELD';

export interface WorkflowCondition {
  id: string;
  type: TransitionConditionType;
  configuration: Record<string, any>;
  errorMessage?: string | null;
}

export interface WorkflowHook {
  id: string;
  eventType: HookEventType;
  configuration: Record<string, any>;
  executionOrder: number;
}

export interface WorkflowTransition {
  id: string;
  name: string;
  fromStateId: string;
  toStateId: string;
  requiredRole?: string | null;
  fromState: { id: string; name: string; color: string };
  toState: { id: string; name: string; color: string };
  conditions: WorkflowCondition[];
  hooks: WorkflowHook[];
}

export interface WorkflowState {
  id: string;
  name: string;
  description?: string | null;
  color: string;
  isInitial: boolean;
  isTerminal: boolean;
  positionX: number;
  positionY: number;
}

export interface WorkflowDefinition {
  id: string;
  teamId: string;
  name: string;
  description?: string | null;
  status: WorkflowStatus;
  version: number;
  createdAt: string;
  updatedAt: string;
  states: WorkflowState[];
  transitions: WorkflowTransition[];
  _count?: {
    tasks?: number;
  };
}

export interface TransitionHistoryItem {
  id: string;
  taskId: string;
  fromState: string;
  toState: string;
  durationSeconds?: number | null;
  timestamp: string;
  performedBy: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}
