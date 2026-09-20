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
  teamId: string;
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
  teamId: string;
  totalMembers: number;
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
  avgCompletionTimeHours: number;
  activeWorkflows: number;
}
