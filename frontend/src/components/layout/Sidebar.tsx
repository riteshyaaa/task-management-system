import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  CheckSquare,
  Briefcase,
  Wrench,
  GitBranch,
  FileCode2,
  Repeat,
  History,
  Users,
  Flame,
  ChevronDown,
  Layers,
  Sparkles,
} from 'lucide-react';
import { useClient } from '../../context/ClientContext';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../utils/cn';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, setIsOpen }) => {
  const { clients, currentClient, setcurrentClientId } = useClient();
  const { user } = useAuth();

  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/engagements', label: 'Engagements', icon: Briefcase },
    { to: '/service-types', label: 'Service Catalog', icon: Wrench },
    { to: '/tasks', label: 'Kanban Board', icon: CheckSquare },
    { to: '/workflows', label: 'Workflows', icon: GitBranch },
    { to: '/templates', label: 'Templates & Rules', icon: FileCode2 },
    { to: '/recurring', label: 'Recurring Tasks', icon: Repeat },
    { to: '/analytics', label: 'Engagement & Streaks', icon: Flame },
    { to: '/audit', label: 'Audit Trail', icon: History },
    { to: '/client', label: 'Client Members', icon: Users },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed top-0 left-0 bottom-0 z-40 w-64 bg-slate-950/95 border-r border-slate-800/80 flex flex-col transition-transform duration-300 ease-in-out backdrop-blur-xl lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Brand */}
        <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-800/80">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/25">
            <Layers className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-1.5">
              OmniTask <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            </h1>
            <p className="text-[10px] text-slate-400 font-medium">Enterprise Orchestration</p>
          </div>
        </div>

        {/* client Switcher */}
        <div className="p-4 border-b border-slate-800/80">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 block">
            Workspace
          </label>
          <div className="relative">
            <select
              value={currentClient?.id || ''}
              onChange={(e) => setcurrentClientId(e.target.value)}
              className="w-full appearance-none bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl px-3.5 py-2 text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40 pr-8 transition-colors cursor-pointer"
            >
              {clients.length === 0 && <option value="">No client Available</option>}
              {clients.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setIsOpen(false)}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 group',
                  isActive
                    ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                )
              }
            >
              <item.icon className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User Card */}
        {user && (
          <div className="p-4 border-t border-slate-800/80 bg-slate-900/30">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-pink-500 flex items-center justify-center font-bold text-xs text-white shadow-md">
                {(user.firstName || 'U').charAt(0).toUpperCase()}
                {(user.lastName || '').charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white truncate">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-[10px] text-slate-400 truncate">{user.role?.name || 'MEMBER'}</p>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
};
