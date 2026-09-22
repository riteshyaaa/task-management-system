import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { client, clientMember } from '../types/client.types';
import { clientService } from '../services/client.service';
import { useAuth } from './AuthContext';

interface ClientContextType {
  clients: client[];
  currentClient: client | null;
  clientMembers: clientMember[];
  loading: boolean;
  setcurrentClientId: (clientId: string) => void;
  refreshClients: () => Promise<void>;
  createClient: (name: string, description?: string) => Promise<client>;
}

const ClientContext = createContext<ClientContextType | undefined>(undefined);

export const ClientProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [clients, setTeams] = useState<client[]>([]);
  const [currentClient, setcurrentClient] = useState<client | null>(null);
  const [clientMembers, setclientMembers] = useState<clientMember[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const refreshClients = useCallback(async () => {
    if (!isAuthenticated) {
      setTeams([]);
      setcurrentClient(null);
      return;
    }

    try {
      setLoading(true);
      const myClients = await clientService.getmyClients();
      setTeams(myClients);

      // Select saved client or first available client
      const savedClientId = localStorage.getItem('selectedClientId');
      const found = myClients.find((t) => t.id === savedClientId);
      if (found) {
        setcurrentClient(found);
      } else if (myClients.length > 0) {
        setcurrentClient(myClients[0]);
        localStorage.setItem('selectedClientId', myClients[0].id);
      } else {
        setcurrentClient(null);
      }
    } catch (error) {
      console.error('Failed to load clients:', error);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    refreshClients();
  }, [refreshClients]);

  // Load client members whenever currentClient changes
  useEffect(() => {
    if (currentClient) {
      clientService
        .getclientMembers(currentClient.id)
        .then(setclientMembers)
        .catch((err) => console.error('Failed to load client members:', err));
    } else {
      setclientMembers([]);
    }
  }, [currentClient]);

  const setcurrentClientId = (clientId: string) => {
    const found = clients.find((t) => t.id === clientId);
    if (found) {
      setcurrentClient(found);
      localStorage.setItem('selectedClientId', found.id);
    }
  };

  const createClient = async (name: string, description?: string) => {
    const newTeam = await clientService.createClient({ name, description });
    await refreshClients();
    setcurrentClient(newTeam);
    localStorage.setItem('selectedClientId', newTeam.id);
    return newTeam;
  };

  return (
    <ClientContext.Provider
      value={{
        clients,
        currentClient,
        clientMembers,
        loading,
        setcurrentClientId,
        refreshClients,
        createClient,
      }}
    >
      {children}
    </ClientContext.Provider>
  );
};

export const useClient = () => {
  const context = useContext(ClientContext);
  if (!context) {
    throw new Error('useClient must be used within a ClientProvider');
  }
  return context;
};
