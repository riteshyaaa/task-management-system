import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckSquare,
  AlertTriangle,
  Calendar,
  Hourglass,
  ShieldCheck,
  CheckCircle2,
  Briefcase,
  TrendingUp,
  Flame,
  Award,
  ArrowRight,
  Plus,
  GitBranch,
  Activity,
  Sparkles,
  Layers,
  History,
  Clock,
  ExternalLink
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
import { formatRelativeTime } from '../utils/formatters';

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

  // Operational metrics from backend response with fail-safe fallbacks to counts
  const openTasks = overview?.metrics?.openTasks ?? overview?.counts?.open ?? 0;
  const overdueTasks = overview?.metrics?.overdueTasks ?? overview?.counts?.overdue ?? 0;
  const dueToday = overview?.metrics?.dueToday ?? overview?.counts?.dueToday ?? 0;
  const waitingForClient = overview?.metrics?.waitingForClient ?? overview?.counts?.waitingForClient ?? 0;
  const waitingForReview = overview?.metrics?.waitingForReview ?? overview?.counts?.waitingForReview ?? overview?.counts?.review ?? 0;
  const completedThisPeriod = overview?.metrics?.completedThisPeriod ?? overview?.counts?.completedThisPeriod ?? overview?.counts?.done ?? 0;
  const engagementsInProgress = overview?.metrics?.engagementsInProgress ?? overview?.counts?.engagementsInProgress ?? 0;

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
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            Welcome back, {user?.firstName}! <Sparkles className="w-5 h-5 text-indigo-400 inline" />
          </h1>
          <p className="text-sm text-slate-300 mt-1">
            Operational overview for <span className="font-semibold text-indigo-300">{currentClient?.name || 'All Clients'}</span> workspace.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link to="/tasks?create=true">
            <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />}>
              Create Task
            </Button>
          </Link>
          <Link to="/engagements">
            <Button variant="secondary" leftIcon={<Briefcase className="w-4 h-4" />}>
              Engagements
            </Button>
          </Link>
          <Link to="/tasks">
            <Button variant="outline" rightIcon={<ArrowRight className="w-4 h-4" />}>
              Kanban Board
            </Button>
          </Link>
        </div>
      </div>

      {/* Primary Section: Engagement & Operational Overview */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-400" /> Engagement Overview
            </h2>
            <p className="text-xs text-slate-400">
              Real-time operational health indicators and lifecycle queues for client deliverables
            </p>
          </div>
          <Badge variant="primary" size="sm" className="self-start sm:self-auto font-mono">
            {currentClient?.slug || 'GLOBAL SCOPE'}
          </Badge>
        </div>

        {/* 7 Operational Metric Cards in a Responsive Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {/* 1. Open Tasks */}
          <Link to="/tasks?filter=open" className="block group">
            <Card className="h-full flex flex-col justify-between border-slate-800 hover:border-indigo-500/50 hover:bg-slate-900/60 transition-all p-5">
              <div className="flex items-start justify-between">
                <div className="w-11 h-11 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0 group-hover:scale-105 transition-transform">
                  <CheckSquare className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-medium text-slate-500 group-hover:text-indigo-400 flex items-center gap-0.5 transition-colors">
                  View <ArrowRight className="w-3 h-3" />
                </span>
              </div>
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Open Tasks</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <h3 className="text-2xl sm:text-3xl font-bold text-white">{openTasks}</h3>
                  <span className="text-xs text-slate-400">active</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Tasks not yet completed</p>
              </div>
            </Card>
          </Link>

          {/* 2. Overdue */}
          <Link to="/tasks?filter=overdue" className="block group">
            <Card className="h-full flex flex-col justify-between border-slate-800 hover:border-rose-500/50 hover:bg-slate-900/60 transition-all p-5">
              <div className="flex items-start justify-between">
                <div className="w-11 h-11 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0 group-hover:scale-105 transition-transform">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                {overdueTasks > 0 ? (
                  <Badge variant="danger" size="sm">Action Req.</Badge>
                ) : (
                  <span className="text-[11px] font-medium text-slate-500 group-hover:text-rose-400 flex items-center gap-0.5 transition-colors">
                    View <ArrowRight className="w-3 h-3" />
                  </span>
                )}
              </div>
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Overdue</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <h3 className={`text-2xl sm:text-3xl font-bold ${overdueTasks > 0 ? 'text-rose-400' : 'text-white'}`}>
                    {overdueTasks}
                  </h3>
                  <span className="text-xs text-slate-400">past due</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Open tasks past SLA deadline</p>
              </div>
            </Card>
          </Link>

          {/* 3. Due Today */}
          <Link to="/tasks?filter=dueToday" className="block group">
            <Card className="h-full flex flex-col justify-between border-slate-800 hover:border-amber-500/50 hover:bg-slate-900/60 transition-all p-5">
              <div className="flex items-start justify-between">
                <div className="w-11 h-11 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 group-hover:scale-105 transition-transform">
                  <Calendar className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-medium text-slate-500 group-hover:text-amber-400 flex items-center gap-0.5 transition-colors">
                  View <ArrowRight className="w-3 h-3" />
                </span>
              </div>
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Due Today</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <h3 className="text-2xl sm:text-3xl font-bold text-white">{dueToday}</h3>
                  <span className="text-xs text-slate-400">today</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Scheduled for delivery today</p>
              </div>
            </Card>
          </Link>

          {/* 4. Waiting for Client */}
          <Link to="/tasks?filter=waitingForClient" className="block group">
            <Card className="h-full flex flex-col justify-between border-slate-800 hover:border-orange-500/50 hover:bg-slate-900/60 transition-all p-5">
              <div className="flex items-start justify-between">
                <div className="w-11 h-11 rounded-2xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400 shrink-0 group-hover:scale-105 transition-transform">
                  <Hourglass className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-medium text-slate-500 group-hover:text-orange-400 flex items-center gap-0.5 transition-colors">
                  View <ArrowRight className="w-3 h-3" />
                </span>
              </div>
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Waiting for Client</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <h3 className="text-2xl sm:text-3xl font-bold text-white">{waitingForClient}</h3>
                  <span className="text-xs text-slate-400">blocked</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Pending client input or feedback</p>
              </div>
            </Card>
          </Link>

          {/* 5. Waiting for Review */}
          <Link to="/tasks?filter=waitingForReview" className="block group">
            <Card className="h-full flex flex-col justify-between border-slate-800 hover:border-purple-500/50 hover:bg-slate-900/60 transition-all p-5">
              <div className="flex items-start justify-between">
                <div className="w-11 h-11 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0 group-hover:scale-105 transition-transform">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-medium text-slate-500 group-hover:text-purple-400 flex items-center gap-0.5 transition-colors">
                  View <ArrowRight className="w-3 h-3" />
                </span>
              </div>
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Waiting for Review</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <h3 className="text-2xl sm:text-3xl font-bold text-white">{waitingForReview}</h3>
                  <span className="text-xs text-slate-400">in review</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Ready for manager approval</p>
              </div>
            </Card>
          </Link>

          {/* 6. Completed This Period */}
          <Link to="/tasks?filter=completedThisPeriod" className="block group">
            <Card className="h-full flex flex-col justify-between border-slate-800 hover:border-emerald-500/50 hover:bg-slate-900/60 transition-all p-5">
              <div className="flex items-start justify-between">
                <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 group-hover:scale-105 transition-transform">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-medium text-slate-500 group-hover:text-emerald-400 flex items-center gap-0.5 transition-colors">
                  View <ArrowRight className="w-3 h-3" />
                </span>
              </div>
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Completed This Period</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <h3 className="text-2xl sm:text-3xl font-bold text-emerald-400">{completedThisPeriod}</h3>
                  <span className="text-xs text-slate-400">delivered</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Deliverables completed this cycle</p>
              </div>
            </Card>
          </Link>

          {/* 7. Engagements In Progress */}
          <Link to="/engagements?status=ACTIVE" className="block group sm:col-span-2 lg:col-span-1 xl:col-span-2">
            <Card className="h-full flex flex-col justify-between border-slate-800 hover:border-sky-500/50 hover:bg-slate-900/60 transition-all p-5">
              <div className="flex items-start justify-between">
                <div className="w-11 h-11 rounded-2xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0 group-hover:scale-105 transition-transform">
                  <Briefcase className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-medium text-slate-500 group-hover:text-sky-400 flex items-center gap-0.5 transition-colors">
                  View Engagements <ArrowRight className="w-3 h-3" />
                </span>
              </div>
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Engagements In Progress</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <h3 className="text-2xl sm:text-3xl font-bold text-sky-400">{engagementsInProgress}</h3>
                  <span className="text-xs text-slate-400">active engagements</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Active client service engagements underway</p>
              </div>
            </Card>
          </Link>
        </div>
      </div>

      {/* Main Grid: Pipeline Priority + Contributor Velocity & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Priority Distribution & Recent Activity */}
        <div className="lg:col-span-2 space-y-6">
          {/* Priority & Pipeline Distribution */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-400" /> Deliverable Priority Distribution
              </h3>
              <span className="text-xs text-slate-400 font-mono">
                Total: {(overview?.priorityDistribution.URGENT || 0) + (overview?.priorityDistribution.HIGH || 0) + (overview?.priorityDistribution.MEDIUM || 0) + (overview?.priorityDistribution.LOW || 0)} tasks
              </span>
            </div>

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

          {/* Recent Operational Activity Log */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <History className="w-4 h-4 text-indigo-400" /> Recent Operational Activity
              </h3>
              <Link to="/audit-logs" className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1">
                Audit Trail <ExternalLink className="w-3 h-3" />
              </Link>
            </div>

            <div className="space-y-2.5">
              {!overview?.recentActivities || overview.recentActivities.length === 0 ? (
                <p className="text-xs text-slate-500 py-6 text-center">No recent activity logs found for this client</p>
              ) : (
                overview.recentActivities.slice(0, 6).map((act) => (
                  <div
                    key={act.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/40 border border-slate-800/80 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0 text-[10px] font-bold">
                        {act.entityType.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-white">
                          {act.performedBy?.firstName ? `${act.performedBy.firstName} ${act.performedBy.lastName || ''}` : 'System User'}
                          <span className="text-slate-400 font-normal"> performed </span>
                          <span className="text-indigo-300 font-mono">{act.action}</span>
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {act.entityType} {act.performedBy?.email ? `• ${act.performedBy.email}` : ''}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono shrink-0 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatRelativeTime(act.timestamp)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Daily Login Streak (Kept lower as requested) */}
          <Card className="bg-gradient-to-br from-slate-900/90 to-indigo-950/40 border-indigo-500/20">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                  <Flame className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Daily Login Streak</h3>
                  <p className="text-xs text-slate-400">Consistent activity boosts team velocity</p>
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
        </div>

        {/* Right Column: Contributor Velocity & Orchestration Shortcuts */}
        <div className="space-y-6">
          {/* Contributor Velocity (Leaderboard) */}
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
                        <div className="w-6 text-center text-xs font-bold shrink-0">
                          {idx === 0 ? (
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px]">#1</span>
                          ) : idx === 1 ? (
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-400/20 text-slate-300 border border-slate-400/30 text-[10px]">#2</span>
                          ) : idx === 2 ? (
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-700/20 text-amber-500 border border-amber-700/30 text-[10px]">#3</span>
                          ) : (
                            <span className="text-slate-500 font-mono text-xs">#{idx + 1}</span>
                          )}
                        </div>
                        <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center font-bold text-xs text-white">
                          {initial}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-white">
                            {firstName} {lastName}
                          </p>
                          <p className="text-[10px] text-slate-400">{completed} deliverables completed</p>
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

          {/* Quick Orchestration Shortcuts */}
          <Card>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-3">Orchestration & Tools</h3>
            <div className="space-y-2">
              <Link
                to="/engagements"
                className="flex items-center justify-between p-3 rounded-xl bg-slate-950/40 border border-slate-800 hover:border-indigo-500/40 hover:bg-slate-900 transition-all group"
              >
                <div className="flex items-center gap-2.5">
                  <Briefcase className="w-4 h-4 text-sky-400 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-semibold text-slate-200">Engagements Portfolio</span>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
              </Link>

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

              <Link
                to="/recurring"
                className="flex items-center justify-between p-3 rounded-xl bg-slate-950/40 border border-slate-800 hover:border-emerald-500/40 hover:bg-slate-900 transition-all group"
              >
                <div className="flex items-center gap-2.5">
                  <TrendingUp className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-semibold text-slate-200">Recurring Task Schedules</span>
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
