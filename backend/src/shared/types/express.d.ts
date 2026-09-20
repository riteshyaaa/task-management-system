import { RoleName, TeamRole } from '@prisma/client';

export interface AuthenticatedUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: RoleName[];
  permissions: string[];
}

export interface AuditContext {
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      teamMembership?: {
        teamId: string;
        role: TeamRole;
      };
      auditContext?: AuditContext;
    }
  }
}
