import { format, formatDistanceToNow, isPast, isToday, isTomorrow, parseISO } from 'date-fns';

export function formatDate(dateInput?: string | Date | null, formatStr: string = 'MMM d, yyyy'): string {
  if (!dateInput) return '-';
  const date = typeof dateInput === 'string' ? parseISO(dateInput) : dateInput;
  try {
    return format(date, formatStr);
  } catch {
    return '-';
  }
}

export function formatDateTime(dateInput?: string | Date | null): string {
  if (!dateInput) return '-';
  const date = typeof dateInput === 'string' ? parseISO(dateInput) : dateInput;
  try {
    return format(date, 'MMM d, yyyy h:mm a');
  } catch {
    return '-';
  }
}

export function formatRelativeTime(dateInput?: string | Date | null): string {
  if (!dateInput) return '-';
  const date = typeof dateInput === 'string' ? parseISO(dateInput) : dateInput;
  try {
    return formatDistanceToNow(date, { addSuffix: true });
  } catch {
    return '-';
  }
}

export function getDueDateLabel(dueDateInput?: string | Date | null): { text: string; isOverdue: boolean; isDueToday: boolean } {
  if (!dueDateInput) return { text: '', isOverdue: false, isDueToday: false };
  const date = typeof dueDateInput === 'string' ? parseISO(dueDateInput) : dueDateInput;

  if (isToday(date)) {
    return { text: 'Today', isOverdue: false, isDueToday: true };
  }
  if (isTomorrow(date)) {
    return { text: 'Tomorrow', isOverdue: false, isDueToday: false };
  }
  if (isPast(date)) {
    return { text: `${format(date, 'MMM d')} (Overdue)`, isOverdue: true, isDueToday: false };
  }
  return { text: format(date, 'MMM d'), isOverdue: false, isDueToday: false };
}

export function getInitials(firstName?: string | null, lastName?: string | null): string {
  const first = (firstName || '').trim().charAt(0).toUpperCase();
  const last = (lastName || '').trim().charAt(0).toUpperCase();
  return `${first}${last}` || 'U';
}

export function formatDurationHours(hours?: number | null): string {
  if (hours === undefined || hours === null) return '-';
  if (hours < 1) {
    return `${Math.round(hours * 60)}m`;
  }
  return `${hours.toFixed(1)}h`;
}
