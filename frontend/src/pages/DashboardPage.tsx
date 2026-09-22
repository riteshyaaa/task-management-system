import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckSquare,
  AlertCircle,
  TrendingUp,
  Flame,
  Award,
  ArrowRight,
  Plus,
  GitBranch,
  Calendar,
  Activity,
} from 'lucide-react';
import { useClient } from '../context/ClientContext';
import { useAuth } from '../context/AuthContext';
import { dashboardService } from '../services/dashboard.service';
import { engagementService } from '../services/engagement.service';
import { DashboardOverviewData } from '../types/dashboard.types';
import { LeaderboardUser, LoginStreak } from '../types/engagement.types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';

export const DashboardPage: React.FC = () => {
  const { currentClient } = useClient();
  const { user } = useAuth();
  const [overview, setOverview] = useState<DashboardOverviewData | null>(null);
  const [streak, setStreak] = useState<LoginStreak | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setLoading(true);
        const [overviewData, streakData, leaderboardData] = await Promise.allSettled([
          dashboardService.getOverview(currentClient?.id),
          engagementService.getStreak(),
          engagementService.getLeaderboard(currentClient?.id),
        ]);

        if (overviewData.status === 'fulfilled') setOverview(overviewData.value);
        if (streakData.status === 'fulfilled') setStreak(streakData.value);
        if (leaderboardData.status === 'fulfilled') setLeaderboard(leaderboardData.value);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, [currentClient?.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-indigo-950/60 via-slate-900/60 to-purple-950/40 border border-indigo-500/20 rounded-3xl p-6 sm:p-8 backdrop-blur-md">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Welcome back, {user?.firstName}! ðŸ‘‹
          </h1>
          <p className="text-sm text-slate-300 mt-1">
            Here's what's happening across <span className="font-semibold text-indigo-300">{currentClient?.name || 'your workspace'}</span> today.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/tasks?create=true">
            <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />}>
              Create Task
            </Button>
          </Link>
          <Link to="/tasks">
            <Button variant="secondary" rightIcon={<ArrowRight className="w-4 h-4" />}>
              Kanban Board
            </Button>
          </Link>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
            <CheckSquare className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Tasks</p>
            <h3 className="text-2xl font-bold text-white mt-0.5">{overview?.counts.total ?? 0}</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Across all sprint cycles</p>
          </div>
        </Card>

        <Card className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">In Progress</p>
            <h3 className="text-2xl font-bold text-white mt-0.5">{overview?.counts.inProgress ?? 0}</h3>
            <p className="text-[11px] text-sky-400 mt-0.5">{overview?.counts.review ?? 0} in review</p>
          </div>
        </Card>

        <Card className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Completed</p>
            <h3 className="text-2xl font-bold text-white mt-0.5">{overview?.counts.done ?? 0}</h3>
            <p className="text-[11px] text-emerald-400 mt-0.5">Successfully delivered</p>
          </div>
        </Card>

        <Card className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Overdue / Action Needed</p>
            <h3 className="text-2xl font-bold text-white mt-0.5">{overview?.counts.overdue ?? 0}</h3>
            <p className="text-[11px] text-rose-400 mt-0.5">{overview?.counts.dueSoon ?? 0} due soon</p>
          </div>
        </Card>
      </div>

      {/* Main Grid: Streak & Status Breakdown + Leaderboard & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols */}
        <div className="lg:col-span-2 space-y-6">
          {/* Streak & Engagement Card */}
          <Card className="bg-gradient-to-br from-slate-900/90 to-indigo-950/40 border-indigo-500/20">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                  <Flame className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Daily Login Streak</h3>
                  <p className="text-xs text-slate-400">Consistent activity boosts client velocity</p>
                </div>
              </div>
              <Badge variant="warning" size="md">
                {streak?.currentStreak ?? 1} DAY STREAK
              </Badge>
            </div>

            <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-800">
              <div className="text-center p-3 rounded-xl bg-slate-950/40 border border-slate-800/80">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Current Streak</p>
                <p className="text-xl font-bold text-amber-300 mt-1">{streak?.currentStreak ?? 1} days</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-slate-950/40 border border-slate-800/80">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Longest Streak</p>
                <p className="text-xl font-bold text-indigo-300 mt-1">{streak?.longestStreak ?? 1} days</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-slate-950/40 border border-slate-800/80">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Active</p>
                <p className="text-xl font-bold text-emerald-300 mt-1">{streak?.totalActiveDays ?? 1} days</p>
              </div>
            </div>
          </Card>

          {/* Priority & Pipeline Distribution */}
          <Card>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-400" /> Pipeline Priority Distribution
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl bg-rose-950/30 border border-rose-500/20">
                <div className="flex items-center justify-between text-xs text-rose-300 font-semibold mb-1">
                  <span>Urgent</span>
                  <span>{overview?.priorityDistribution.URGENT ?? 0}</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-rose-500 h-full rounded-full"
                    style={{
                      width: `${
                        overview?.counts.total ? ((overview.priorityDistribution.URGENT || 0) / overview.counts.total) * 100 : 0
                      }%`,
                    }}
                  />
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/20">
                <div className="flex items-center justify-between text-xs text-amber-300 font-semibold mb-1">
                  <span>High</span>
                  <span>{overview?.priorityDistribution.HIGH ?? 0}</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-amber-500 h-full rounded-full"
                    style={{
                      width: `${
                        overview?.counts.total ? ((overview.priorityDistribution.HIGH || 0) / overview.counts.total) * 100 : 0
                      }%`,
                    }}
                  />
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-indigo-950/30 border border-indigo-500/20">
                <div className="flex items-center justify-between text-xs text-indigo-300 font-semibold mb-1">
                  <span>Medium</span>
                  <span>{overview?.priorityDistribution.MEDIUM ?? 0}</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-indigo-500 h-full rounded-full"
                    style={{
                      width: `${
                        overview?.counts.total ? ((overview.priorityDistribution.MEDIUM || 0) / overview.counts.total) * 100 : 0
                      }%`,
                    }}
                  />
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                <div className="flex items-center justify-between text-xs text-slate-300 font-semibold mb-1">
                  <span>Low</span>
                  <span>{overview?.priorityDistribution.LOW ?? 0}</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-slate-500 h-full rounded-full"
                    style={{
                      width: `${
                        overview?.counts.total ? ((overview.priorityDistribution.LOW || 0) / overview.counts.total) * 100 : 0
                      }%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Col: Top Leaderboard & Quick Tools */}
        <div className="space-y-6">
          {/* Leaderboard Card */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-400" /> Contributor Velocity
              </h3>
              <Link to="/analytics" className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold">
                View All
              </Link>
            </div>

            <div className="space-y-3">
              {leaderboard.length === 0 ? (
                <p className="text-xs text-slate-500 py-4 text-center">No activity recorded yet</p>
              ) : (
                leaderboard.slice(0, 5).map((u, idx) => {
                  const firstName = u.firstName || (u as any).user?.firstName || 'User';
                  const lastName = u.lastName || (u as any).user?.lastName || '';
                  const initial = firstName.charAt(0).toUpperCase() || 'U';
                  const completed = u.tasksCompleted ?? 0;
                  const streakDays = u.currentStreak ?? 1;

                  return (
                    <div
                      key={u.id || idx}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/40 border border-slate-800/80 hover:border-slate-700 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-5 text-center text-xs font-bold text-slate-400">
                          {idx === 0 ? 'ðŸ¥‡' : idx === 1 ? 'ðŸ¥ˆ' : idx === 2 ? 'ðŸ¥‰' : `${idx + 1}`}
                        </span>
                        <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center font-bold text-xs text-white">
                          {initial}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-white">
                            {firstName} {lastName}
                          </p>
                          <p className="text-[10px] text-slate-400">{completed} tasks completed</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 text-xs font-bold text-amber-400">
                        <Flame className="w-3.5 h-3.5" />
                        {streakDays}d
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>

          {/* Quick Shortcuts */}
          <Card>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-3">Orchestration Tools</h3>
            <div className="space-y-2">
              <Link
                to="/workflows"
                className="flex items-center justify-between p-3 rounded-xl bg-slate-950/40 border border-slate-800 hover:border-indigo-500/40 hover:bg-slate-900 transition-all group"
              >
                <div className="flex items-center gap-2.5">
                  <GitBranch className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-semibold text-slate-200">Workflow State Machines</span>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
              </Link>

              <Link
                to="/templates"
                className="flex items-center justify-between p-3 rounded-xl bg-slate-950/40 border border-slate-800 hover:border-indigo-500/40 hover:bg-slate-900 transition-all group"
              >
                <div className="flex items-center gap-2.5">
                  <Calendar className="w-4 h-4 text-violet-400 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-semibold text-slate-200">Templates & Automation</span>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
