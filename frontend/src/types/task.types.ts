export type TaskStatus =
  | 'NOT_STARTED'
  | 'TODO'
  | 'IN_PROGRESS'
  | 'READY_FOR_REVIEW'
  | 'WAITING_FOR_CLIENT'
  | 'CHANGES_REQUESTED'
  | 'COMPLETED'
  | 'REVIEW'
  | 'DONE';

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface Label {
  id: string;
  name: string;
  color: string;
  description?: string | null;
  clientId: string;
}

export interface TaskComment {
  id: string;
  taskId: string;
  userId: string;
  content: string;
  isEdited: boolean;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatarUrl?: string | null;
  };
}

export interface Subtask {
  id: string;
  taskNumber: number;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId?: string | null;
  position: number;
  dueDate?: string | null;
}

export interface Task {
  id: string;
  taskNumber: number;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string | null;
  startDate?: string | null;
  completedAt?: string | null;
  estimatedHours?: number | null;
  actualHours?: number | null;
  position: number;
  isDeleted: boolean;
  version: number;
  metadata?: Record<string, any>;
  clientId: string;
  engagementId?: string | null;
  assigneeId?: string | null;
  reporterId: string;
  parentTaskId?: string | null;
  templateId?: string | null;
  recurrenceId?: string | null;
  createdAt: string;
  updatedAt: string;

  // Populated relations
  engagement?: {
    id: string;
    title: string;
    status: string;
  } | null;
  assignee?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatarUrl?: string | null;
  } | null;
  reporter?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatarUrl?: string | null;
  };
  taskLabels?: {
    labelId: string;
    label: Label;
  }[];
  subtasks?: Subtask[];
  comments?: TaskComment[];
  _count?: {
    comments?: number;
    subtasks?: number;
    watchers?: number;
  };
}

export interface CreateTaskPayload {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  clientId?: string;
  engagementId?: string;
  assigneeId?: string;
  dueDate?: string;
  startDate?: string;
  estimatedHours?: number;
  parentTaskId?: string;
  templateId?: string;
  labelIds?: string[];
  subtasks?: { title: string; priority?: TaskPriority }[];
}

export interface UpdateTaskPayload {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  engagementId?: string | null;
  assigneeId?: string | null;
  dueDate?: string | null;
  startDate?: string | null;
  estimatedHours?: number | null;
  actualHours?: number | null;
  position?: number;
  version?: number;
  labelIds?: string[];
}
