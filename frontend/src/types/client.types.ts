export type ClientRole = 'ADMIN' | 'MANAGER' | 'MEMBER';

export interface clientMember {
  id: string;
  clientId: string;
  userId: string;
  role: ClientRole;
  joinedAt: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string | null;
  };
}

export interface client {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  members?: clientMember[];
  _count?: {
    members?: number;
    tasks?: number;
  };
}
