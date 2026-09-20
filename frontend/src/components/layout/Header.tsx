import React from 'react';
import { Menu, LogOut, Flame, Plus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTeam } from '../../context/TeamContext';
import { Button } from '../ui/Button';

interface HeaderProps {
  onMenuClick: () => void;
  onNewTaskClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onMenuClick, onNewTaskClick }) => {
  const { user, logout } = useAuth();
  const { currentTeam } = useTeam();

  return (
    <header className="h-16 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md px-4 sm:px-8 flex items-center justify-between sticky top-0 z-20">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
            {currentTeam?.name || 'Workspace'}
          </h2>
          <p className="text-[11px] text-slate-400">Collaborative Workflow Engine</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {onNewTaskClick && (
          <Button size="sm" variant="primary" leftIcon={<Plus className="w-4 h-4" />} onClick={onNewTaskClick}>
            New Task
          </Button>
        )}

        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold">
          <Flame className="w-4 h-4 text-amber-400 animate-pulse" />
          <span>Active Streak</span>
        </div>

        {user && (
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-xs text-white shadow-md">
            {(user.firstName || 'U').charAt(0).toUpperCase()}
          </div>
        )}

        <button
          onClick={logout}
          title="Sign out"
          className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
