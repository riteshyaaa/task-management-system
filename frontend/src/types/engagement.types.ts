export type EngagementStatus = 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

export interface Engagement {
  id: string;
  clientId: string;
  serviceTypeId: string;
  title: string;
  description?: string | null;
  status: EngagementStatus;
  periodStart: string;
  periodEnd: string;
  dueDate?: string | null;
  managerId?: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  client?: {
    id: string;
    name: string;
    slug?: string;
  };
  serviceType?: {
    id: string;
    name: string;
    defaultCadence?: string;
    estimatedHours?: number | null;
  };
  manager?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatarUrl?: string | null;
  } | null;
  createdBy?: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
  };
  tasks?: any[];
  totalTasks?: number;
  completedTasks?: number;
  progressPercent?: number;
  progressPercentage?: number;
  taskCount?: number;
}

export interface CreateEngagementPayload {
  clientId: string;
  serviceTypeId: string;
  title: string;
  description?: string | null;
  status?: EngagementStatus;
  periodStart: string;
  periodEnd: string;
  dueDate?: string | null;
  managerId?: string | null;
  templateId?: string | null;
  autoGenerateTasks?: boolean;
  assigneeId?: string | null;
}

export interface UpdateEngagementPayload {
  title?: string;
  description?: string | null;
  status?: EngagementStatus;
  periodStart?: string;
  periodEnd?: string;
  dueDate?: string | null;
  managerId?: string | null;
}

export interface FilterEngagementsParams {
  clientId?: string;
  serviceTypeId?: string;
  status?: EngagementStatus;
  managerId?: string;
  periodStartFrom?: string;
  periodEndTo?: string;
  search?: string;
  page?: number;
  limit?: number;
}

// Gamification & Engagement Analytics types
export interface LoginStreak {
  id: string;
  userId: string;
  currentStreak: number;
  longestStreak: number;
  lastLoginDate: string;
  freezeDaysLeft: number;
  totalActiveDays: number;
}

export interface TaskVelocityMetric {
  id: string;
  clientId: string;
  periodStart: string;
  periodEnd: string;
  tasksCompleted: number;
  storyPointsCompleted?: number | null;
  avgCompletionHours: number;
  p50CompletionHours: number;
  p90CompletionHours: number;
  throughputRate: number;
}

export interface LeaderboardUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl?: string | null;
  tasksCompleted: number;
  currentStreak: number;
  longestStreak: number;
  score: number;
}

export interface TeamPerformanceSummary {
  clientId: string;
  totalMembers: number;
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
  avgCompletionTimeHours: number;
  activeWorkflows: number;
}
