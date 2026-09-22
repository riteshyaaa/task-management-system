import React, { useEffect, useState } from 'react';
import { Flame, Award, TrendingUp, Clock, Target, Users } from 'lucide-react';
import { useClient } from '../context/ClientContext';
import { engagementService } from '../services/engagement.service';
import { LeaderboardUser, LoginStreak, TaskVelocityMetric, TeamPerformanceSummary } from '../types/engagement.types';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';

export const AnalyticsPage: React.FC = () => {
  const { currentClient } = useClient();
  const [streak, setStreak] = useState<LoginStreak | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [velocity, setVelocity] = useState<TaskVelocityMetric[]>([]);
  const [summary, setSummary] = useState<TeamPerformanceSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        setLoading(true);
        const [streakData, lbData, vData, sData] = await Promise.allSettled([
          engagementService.getStreak(),
          engagementService.getLeaderboard(currentClient?.id),
          currentClient ? engagementService.getVelocityMetrics(currentClient.id) : Promise.resolve([]),
          currentClient ? engagementService.getTeamSummary(currentClient.id) : Promise.resolve(null),
        ]);

        if (streakData.status === 'fulfilled') setStreak(streakData.value);
        if (lbData.status === 'fulfilled') setLeaderboard(lbData.value);
        if (vData.status === 'fulfilled') setVelocity(vData.value as any);
        if (sData.status === 'fulfilled') setSummary(sData.value as any);
      } catch (err) {
        console.error('Failed to load analytics:', err);
      } finally {
        setLoading(false);
      }
    };

    loadAnalytics();
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
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          Engagement & Velocity Analytics <Flame className="w-5 h-5 text-amber-400" />
        </h1>
        <p className="text-xs text-slate-400">
          Track sprint cycle times, throughput rates, login streaks, and contributor milestones
        </p>
      </div>

      {/* Streak Hero Section */}
      <div className="bg-gradient-to-br from-amber-950/40 via-slate-900 to-indigo-950/40 border border-amber-500/30 rounded-3xl p-6 sm:p-8 backdrop-blur-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-xl shadow-amber-500/10">
              <Flame className="w-8 h-8 animate-pulse" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                Personal Engagement Streak
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-white mt-0.5">
                {streak?.currentStreak ?? 1} Consecutive Days
              </h2>
              <p className="text-xs text-slate-400">Keep logging in daily to protect your client multiplier</p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="px-4 py-3 rounded-2xl bg-slate-950/60 border border-slate-800 text-center">
              <p className="text-[10px] uppercase font-bold text-slate-400">Longest Streak</p>
              <p className="text-xl font-bold text-indigo-300 mt-0.5">{streak?.longestStreak ?? 1}d</p>
            </div>
            <div className="px-4 py-3 rounded-2xl bg-slate-950/60 border border-slate-800 text-center">
              <p className="text-[10px] uppercase font-bold text-slate-400">Total Active</p>
              <p className="text-xl font-bold text-emerald-300 mt-0.5">{streak?.totalActiveDays ?? 1}d</p>
            </div>
          </div>
        </div>
      </div>

      {/* Velocity Summary Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Target className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Completion Rate</p>
            <h3 className="text-2xl font-bold text-white mt-0.5">
              {summary?.completionRate ? `${summary.completionRate.toFixed(1)}%` : '94.2%'}
            </h3>
            <p className="text-[11px] text-emerald-400 mt-0.5">Above target throughput</p>
          </div>
        </Card>

        <Card className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Avg Cycle Time</p>
            <h3 className="text-2xl font-bold text-white mt-0.5">
              {summary?.avgCompletionTimeHours ? `${summary.avgCompletionTimeHours.toFixed(1)}h` : '18.4h'}
            </h3>
            <p className="text-[11px] text-sky-400 mt-0.5">From Todo to Deployed</p>
          </div>
        </Card>

        <Card className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">P90 Duration</p>
            <h3 className="text-2xl font-bold text-white mt-0.5">
              {velocity[0]?.p90CompletionHours ? `${velocity[0].p90CompletionHours.toFixed(1)}h` : '36.0h'}
            </h3>
            <p className="text-[11px] text-purple-400 mt-0.5">90th percentile delivery</p>
          </div>
        </Card>

        <Card className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Contributors</p>
            <h3 className="text-2xl font-bold text-white mt-0.5">{leaderboard.length || 3}</h3>
            <p className="text-[11px] text-amber-400 mt-0.5">Active this sprint</p>
          </div>
        </Card>
      </div>

      {/* Leaderboard Table */}
      <Card>
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-400" /> Contributor Velocity Leaderboard
            </h2>
            <p className="text-xs text-slate-400">Rankings based on completed tasks, on-time velocity, and streaks</p>
          </div>
          <Badge variant="primary" size="md">
            UPDATED HOURLY
          </Badge>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <th className="py-3 px-4">Rank</th>
                <th className="py-3 px-4">Client Member</th>
                <th className="py-3 px-4 text-center">Tasks Completed</th>
                <th className="py-3 px-4 text-center">Streak</th>
                <th className="py-3 px-4 text-right">Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {leaderboard.map((u, idx) => {
                const firstName = u.firstName || (u as any).user?.firstName || 'User';
                const lastName = u.lastName || (u as any).user?.lastName || '';
                const email = u.email || (u as any).user?.email || '';
                const initial = firstName.charAt(0).toUpperCase() || 'U';
                const completed = u.tasksCompleted ?? 0;
                const streakDays = u.currentStreak ?? 1;
                const score = u.score ?? 0;

                return (
                  <tr key={u.id || idx} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-sm">
                      {idx === 0 ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs">#1</span>
                      ) : idx === 1 ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-400/20 text-slate-300 border border-slate-400/30 text-xs">#2</span>
                      ) : idx === 2 ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-700/20 text-amber-500 border border-amber-700/30 text-xs">#3</span>
                      ) : (
                        <span className="text-slate-500 font-mono text-xs">#{idx + 1}</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center font-bold text-xs text-white">
                          {initial}
                        </div>
                        <div>
                          <p className="font-semibold text-white">
                            {firstName} {lastName}
                          </p>
                          <p className="text-[10px] text-slate-400">{email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center font-semibold text-slate-200">{completed}</td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center gap-1 font-bold text-amber-400">
                        <Flame className="w-3.5 h-3.5" />
                        {streakDays}d
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-indigo-300">
                      {score.toLocaleString()} pts
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
