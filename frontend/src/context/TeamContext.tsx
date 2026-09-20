import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Team, TeamMember } from '../types/team.types';
import { teamService } from '../services/team.service';
import { useAuth } from './AuthContext';

interface TeamContextType {
  teams: Team[];
  currentTeam: Team | null;
  teamMembers: TeamMember[];
  loading: boolean;
  setCurrentTeamId: (teamId: string) => void;
  refreshTeams: () => Promise<void>;
  createTeam: (name: string, description?: string) => Promise<Team>;
}

const TeamContext = createContext<TeamContextType | undefined>(undefined);

export const TeamProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [currentTeam, setCurrentTeam] = useState<Team | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const refreshTeams = useCallback(async () => {
    if (!isAuthenticated) {
      setTeams([]);
      setCurrentTeam(null);
      return;
    }

    try {
      setLoading(true);
      const myTeams = await teamService.getMyTeams();
      setTeams(myTeams);

      // Select saved team or first available team
      const savedTeamId = localStorage.getItem('selectedTeamId');
      const found = myTeams.find((t) => t.id === savedTeamId);
      if (found) {
        setCurrentTeam(found);
      } else if (myTeams.length > 0) {
        setCurrentTeam(myTeams[0]);
        localStorage.setItem('selectedTeamId', myTeams[0].id);
      } else {
        setCurrentTeam(null);
      }
    } catch (error) {
      console.error('Failed to load teams:', error);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    refreshTeams();
  }, [refreshTeams]);

  // Load team members whenever currentTeam changes
  useEffect(() => {
    if (currentTeam) {
      teamService
        .getTeamMembers(currentTeam.id)
        .then(setTeamMembers)
        .catch((err) => console.error('Failed to load team members:', err));
    } else {
      setTeamMembers([]);
    }
  }, [currentTeam]);

  const setCurrentTeamId = (teamId: string) => {
    const found = teams.find((t) => t.id === teamId);
    if (found) {
      setCurrentTeam(found);
      localStorage.setItem('selectedTeamId', found.id);
    }
  };

  const createTeam = async (name: string, description?: string) => {
    const newTeam = await teamService.createTeam({ name, description });
    await refreshTeams();
    setCurrentTeam(newTeam);
    localStorage.setItem('selectedTeamId', newTeam.id);
    return newTeam;
  };

  return (
    <TeamContext.Provider
      value={{
        teams,
        currentTeam,
        teamMembers,
        loading,
        setCurrentTeamId,
        refreshTeams,
        createTeam,
      }}
    >
      {children}
    </TeamContext.Provider>
  );
};

export const useTeam = () => {
  const context = useContext(TeamContext);
  if (!context) {
    throw new Error('useTeam must be used within a TeamProvider');
  }
  return context;
};
