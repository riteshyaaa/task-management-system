export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'STATE_TRANSITION' | 'BULK_UPDATE' | 'BULK_DELETE' | 'LOGIN' | 'LOGOUT';

export interface AuditLog {
  id: string;
  entityType: string;
  entityId: string;
  action: AuditAction;
  performedById?: string | null;
  impersonatedById?: string | null;
  teamId?: string | null;
  oldValues?: Record<string, any> | null;
  newValues?: Record<string, any> | null;
  changedFields?: string[] | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  reason?: string | null;
  metadata?: Record<string, any> | null;
  timestamp: string;
  performedBy?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatarUrl?: string | null;
  } | null;
}

export interface AuditQueryParams {
  entityType?: string;
  entityId?: string;
  action?: AuditAction;
  performedById?: string;
  teamId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}
