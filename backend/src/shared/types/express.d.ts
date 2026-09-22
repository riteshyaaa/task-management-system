import { RoleName, ClientRole } from '@prisma/client';

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
      clientMembership?: {
        clientId: string;
        role: ClientRole;
      };
      auditContext?: AuditContext;
    }
  }
}
