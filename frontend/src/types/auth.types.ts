export type SystemRole = 'ADMIN' | 'MANAGER' | 'MEMBER';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string | null;
  isActive: boolean;
  role: {
    id: string;
    name: SystemRole;
    permissions: string[];
  };
  teamMemberships?: {
    teamId: string;
    teamName: string;
    teamSlug: string;
    role: 'ADMIN' | 'MANAGER' | 'MEMBER';
  }[];
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  teamName?: string;
}
