export type RecurrenceFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY' | 'CUSTOM_CRON';
export type InstanceStatus = 'PENDING' | 'GENERATED' | 'SKIPPED' | 'FAILED';

export interface RecurrenceRule {
  id: string;
  templateTaskId: string;
  frequency: RecurrenceFrequency;
  interval: number;
  cronExpression?: string | null;
  startDate: string;
  endDate?: string | null;
  maxOccurrences?: number | null;
  currentOccurrenceCount: number;
  nextOccurrenceDate: string;
  isActive: boolean;
  timezone: string;
  daysOfWeek?: number[];
  dayOfMonth?: number | null;
  weekOfMonth?: number | null;
  monthOfYear?: number | null;
  createdAt: string;
  updatedAt: string;
  templateTask?: {
    id: string;
    title: string;
    priority: string;
    clientId: string;
  };
  exceptions?: { id: string; exceptionDate: string; reason?: string }[];
  instances?: RecurrenceInstance[];
}

export interface RecurrenceInstance {
  id: string;
  recurrenceRuleId: string;
  scheduledDate: string;
  generatedTaskId?: string | null;
  status: InstanceStatus;
  errorMessage?: string | null;
  generatedAt?: string | null;
}
