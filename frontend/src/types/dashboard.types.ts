export type WidgetType = 'METRIC_CARD' | 'VELOCITY_CHART' | 'STATUS_DISTRIBUTION' | 'LEADERBOARD' | 'RECENT_ACTIVITY' | 'STREAK_CARD' | 'UPCOMING_DUE';

export interface DashboardWidget {
  id: string;
  userId: string;
  clientId?: string | null;
  widgetType: WidgetType;
  title: string;
  positionX: number;
  positionY: number;
  width: number;
  height: number;
  configuration: Record<string, any>;
  isVisible: boolean;
}

export interface DashboardOverviewData {
  counts: {
    total: number;
    todo: number;
    inProgress: number;
    review: number;
    done: number;
    overdue: number;
    dueSoon: number;
  };
  priorityDistribution: {
    LOW: number;
    MEDIUM: number;
    HIGH: number;
    URGENT: number;
  };
  recentActivities: {
    id: string;
    action: string;
    entityType: string;
    timestamp: string;
    performedBy?: { firstName: string; lastName: string; email: string };
  }[];
}
