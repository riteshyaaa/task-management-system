export type TeamRole = 'ADMIN' | 'MANAGER' | 'MEMBER';

export interface TeamMember {
  id: string;
  teamId: string;
  userId: string;
  role: TeamRole;
  joinedAt: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string | null;
  };
}

export interface Team {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  members?: TeamMember[];
  _count?: {
    members?: number;
    tasks?: number;
  };
}
