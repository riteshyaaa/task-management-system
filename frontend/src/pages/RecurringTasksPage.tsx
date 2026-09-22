import React, { useEffect, useState } from 'react';
import { Repeat, Plus, Play, Clock, ToggleLeft, ToggleRight } from 'lucide-react';
import { useClient } from '../context/ClientContext';
import { useToast } from '../context/ToastContext';
import { recurringService } from '../services/recurring.service';
import { templateService } from '../services/template.service';
import { RecurrenceRule } from '../types/recurring.types';
import { TaskTemplate } from '../types/template.types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { formatDate } from '../utils/formatters';

export const RecurringTasksPage: React.FC = () => {
  const { currentClient } = useClient();
  const { showToast } = useToast();

  const [rules, setRules] = useState<RecurrenceRule[]>([]);
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [frequency, setFrequency] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY' | 'CUSTOM_CRON'>('DAILY');
  const [cronExpression, setCronExpression] = useState('0 9 * * 1-5');
  const [timezone, setTimezone] = useState('UTC');
  const [submitting, setSubmitting] = useState(false);

  const loadRules = async () => {
    try {
      setLoading(true);
      const data = await recurringService.getRecurrenceRules(currentClient?.id);
      setRules(data);
    } catch (err) {
      console.error('Failed to load recurrence rules:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRules();
    if (currentClient) {
      templateService
        .getTemplates(currentClient.id)
        .then(setTemplates)
        .catch((err) => console.error('Failed to load templates:', err));
    }
  }, [currentClient?.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const handleToggleRule = async (ruleId: string, currentActive: boolean) => {
    try {
      await recurringService.toggleRecurrenceRule(ruleId, !currentActive);
      setRules((prev) =>
        prev.map((r) => (r.id === ruleId ? { ...r, isActive: !currentActive } : r))
      );
      showToast(`Rule ${!currentActive ? 'enabled' : 'paused'}`, 'success');
    } catch (err) {
      showToast('Failed to update recurrence rule', 'error');
    }
  };

  const handleTriggerManually = async (ruleId: string) => {
    try {
      await recurringService.triggerRuleManually(ruleId);
      showToast('Task spawned manually from recurrence schedule!', 'success');
      loadRules();
    } catch (err: any) {
      showToast(err.response?.data?.error?.message || 'Failed to trigger rule', 'error');
    }
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplateId) {
      showToast('Please select a template task', 'warning');
      return;
    }

    try {
      setSubmitting(true);
      await recurringService.createRecurrenceRule({
        templateTaskId: selectedTemplateId,
        frequency,
        interval: 1,
        cronExpression: frequency === 'CUSTOM_CRON' ? cronExpression : undefined,
        startDate: new Date().toISOString(),
        timezone,
      });

      showToast('Recurrence schedule configured!', 'success');
      setIsModalOpen(false);
      loadRules();
    } catch (err: any) {
      showToast(err.response?.data?.error?.message || 'Failed to create schedule', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            Recurring Task Schedules <Repeat className="w-5 h-5 text-indigo-400" />
          </h1>
          <p className="text-xs text-slate-400">
            Automate periodic task generation using interval and cron recurrence engines
          </p>
        </div>

        <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setIsModalOpen(true)}>
          New Schedule
        </Button>
      </div>

      {/* Rules List */}
      <div className="space-y-4">
        {rules.length === 0 ? (
          <Card className="text-center py-12">
            <Repeat className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-300">No recurring schedules active</p>
            <p className="text-xs text-slate-500 mt-1">Configure automated task schedules to run on intervals</p>
          </Card>
        ) : (
          rules.map((rule) => (
            <Card key={rule.id} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                  <Repeat className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white">
                      {rule.templateTask?.title || 'Scheduled Task Template'}
                    </h3>
                    <Badge variant={rule.isActive ? 'success' : 'default'} size="sm">
                      {rule.isActive ? 'ACTIVE' : 'PAUSED'}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-400">
                    <span className="font-semibold text-indigo-300">{rule.frequency}</span>
                    <span>&bull;</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      Next run: {formatDate(rule.nextOccurrenceDate)}
                    </span>
                    <span>&bull;</span>
                    <span>Timezone: {rule.timezone}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 justify-end pt-3 md:pt-0 border-t md:border-t-0 border-slate-800">
                <Button
                  size="sm"
                  variant="outline"
                  leftIcon={<Play className="w-3.5 h-3.5 text-emerald-400" />}
                  onClick={() => handleTriggerManually(rule.id)}
                >
                  Run Now
                </Button>

                <button
                  onClick={() => handleToggleRule(rule.id, rule.isActive)}
                  className="p-1.5 text-slate-400 hover:text-white"
                >
                  {rule.isActive ? (
                    <ToggleRight className="w-8 h-8 text-indigo-400" />
                  ) : (
                    <ToggleLeft className="w-8 h-8 text-slate-600" />
                  )}
                </button>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Create Recurrence Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Schedule Recurring Task"
        description="Configure periodic instance generation from existing templates"
      >
        <form onSubmit={handleCreateRule} className="space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5 block">
              Template Task
            </label>
            <select
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-slate-100"
              required
            >
              <option value="">-- Select Template --</option>
              {templates.map((tpl) => (
                <option key={tpl.id} value={tpl.id}>
                  {tpl.name} ({tpl.defaultTitle})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5 block">
              Frequency
            </label>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-slate-100"
            >
              <option value="DAILY">Daily</option>
              <option value="WEEKLY">Weekly</option>
              <option value="MONTHLY">Monthly</option>
              <option value="CUSTOM_CRON">Custom Cron Expression</option>
            </select>
          </div>

          {frequency === 'CUSTOM_CRON' && (
            <Input
              label="Cron Expression"
              value={cronExpression}
              onChange={(e) => setCronExpression(e.target.value)}
              placeholder="0 9 * * 1-5"
              helperText="Standard 5-field cron: min hour dom mon dow"
              required
            />
          )}

          <Input
            label="Timezone"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            placeholder="UTC or America/New_York"
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={submitting}>
              Schedule Rule
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
