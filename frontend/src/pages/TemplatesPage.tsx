import React, { useEffect, useState } from 'react';
import { FileCode2, Plus, Zap, CheckSquare, Sparkles, ToggleLeft, ToggleRight, ArrowRight } from 'lucide-react';
import { useClient } from '../context/ClientContext';
import { useToast } from '../context/ToastContext';
import { templateService } from '../services/template.service';
import { AutomationRule, TaskTemplate } from '../types/template.types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';

export const TemplatesPage: React.FC = () => {
  const { currentClient } = useClient();
  const { showToast } = useToast();

  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [loading, setLoading] = useState(true);

  // Template Modal
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [defaultTitle, setDefaultTitle] = useState('');
  const [defaultBody, setDefaultBody] = useState('');
  const [variablesInput, setVariablesInput] = useState('environment, version');
  const [itemsInput, setItemsInput] = useState('Write unit tests, Run linting check, Code review, Verify on staging');

  // Rule Modal
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [ruleName, setRuleName] = useState('');
  const [triggerType, setTriggerType] = useState('TASK_STATUS_CHANGED');
  const [actionType, setActionType] = useState('SEND_NOTIFICATION');
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    if (!currentClient) return;
    try {
      setLoading(true);
      const [tplData, ruleData] = await Promise.all([
        templateService.getTemplates(currentClient.id),
        templateService.getAutomationRules(currentClient.id),
      ]);
      setTemplates(tplData);
      setRules(ruleData);
    } catch (err) {
      console.error('Failed to load templates/rules:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentClient?.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentClient || !templateName.trim() || !defaultTitle.trim()) return;

    try {
      setSubmitting(true);
      const vars = variablesInput
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean)
        .map((name) => ({
          name,
          label: name.replace(/_/g, ' ').toUpperCase(),
          defaultValue: '',
          required: true,
        }));

      const items = itemsInput
        .split(',')
        .map((title, idx) => ({
          title: title.trim(),
          position: idx,
        }))
        .filter((item) => item.title.length > 0);

      await templateService.createTemplate({
        clientId: currentClient.id,
        name: templateName,
        defaultTitle,
        defaultBody,
        defaultPriority: 'MEDIUM',
        variables: vars,
        templateItems: items,
      });

      showToast('Template created successfully!', 'success');
      setIsTemplateModalOpen(false);
      setTemplateName('');
      setDefaultTitle('');
      setDefaultBody('');
      loadData();
    } catch (err: any) {
      showToast(err.response?.data?.error?.message || 'Failed to create template', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentClient || !ruleName.trim()) return;

    try {
      setSubmitting(true);
      await templateService.createAutomationRule({
        clientId: currentClient.id,
        name: ruleName,
        triggerType,
        triggerConfig: { status: 'DONE' },
        conditions: [{ field: 'priority', operator: 'EQUALS', value: 'HIGH' }],
        actions: [{ type: actionType, config: { message: 'Task marked as DONE!' } }],
      });

      showToast('Automation rule registered!', 'success');
      setIsRuleModalOpen(false);
      setRuleName('');
      loadData();
    } catch (err: any) {
      showToast(err.response?.data?.error?.message || 'Failed to create rule', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleRule = async (ruleId: string, currentActive: boolean) => {
    try {
      await templateService.toggleAutomationRule(ruleId, !currentActive);
      setRules((prev) =>
        prev.map((r) => (r.id === ruleId ? { ...r, isActive: !currentActive } : r))
      );
      showToast(`Rule ${!currentActive ? 'enabled' : 'disabled'}`, 'success');
    } catch (err) {
      showToast('Failed to toggle rule', 'error');
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            Templates & Event Automation <Zap className="w-5 h-5 text-amber-400" />
          </h1>
          <p className="text-xs text-slate-400">
            Standardize task generation with dynamic variables and automated trigger-action rules
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setIsTemplateModalOpen(true)}
          >
            New Template
          </Button>
          <Button
            variant="primary"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setIsRuleModalOpen(true)}
          >
            New Rule
          </Button>
        </div>
      </div>

      {/* Section 1: Task Templates */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <FileCode2 className="w-4 h-4 text-indigo-400" /> Standardized Task Templates ({templates.length})
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {templates.map((tpl) => (
            <Card key={tpl.id} hover className="flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-bold text-white">{tpl.name}</h3>
                  <Badge variant="primary" size="sm">
                    {tpl.defaultPriority}
                  </Badge>
                </div>
                <p className="text-xs font-mono text-indigo-300 bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                  {tpl.defaultTitle}
                </p>

                {tpl.variables?.length > 0 && (
                  <div className="mt-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-400" /> Variables
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {tpl.variables.map((v) => (
                        <span
                          key={v.name}
                          className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700"
                        >
                          {`{{${v.name}}}`}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {tpl.templateItems?.length > 0 && (
                  <div className="mt-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1">
                      <CheckSquare className="w-3 h-3 text-emerald-400" /> Checklist Items ({tpl.templateItems.length})
                    </p>
                    <ul className="space-y-1">
                      {tpl.templateItems.slice(0, 3).map((item) => (
                        <li key={item.id} className="text-xs text-slate-400 truncate flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0" />
                          {item.title}
                        </li>
                      ))}
                      {tpl.templateItems.length > 3 && (
                        <li className="text-[10px] text-slate-500 font-semibold">
                          +{tpl.templateItems.length - 3} more items...
                        </li>
                      )}
                    </ul>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
                <span>Default priority: {tpl.defaultPriority}</span>
                <span className="text-indigo-400 font-semibold">Ready to instantiate</span>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Section 2: Automation Rules */}
      <div className="space-y-4 pt-4 border-t border-slate-800">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-400" /> Event-Driven Automation Rules ({rules.length})
        </h2>

        <div className="space-y-3">
          {rules.length === 0 ? (
            <Card className="text-center py-8">
              <p className="text-xs text-slate-400">No automation rules configured yet</p>
            </Card>
          ) : (
            rules.map((rule) => (
              <div
                key={rule.id}
                className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-white">{rule.name}</h3>
                      <Badge variant={rule.isActive ? 'success' : 'default'} size="sm">
                        {rule.isActive ? 'ACTIVE' : 'DISABLED'}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-slate-300">
                      <span className="px-2 py-0.5 rounded bg-slate-800 font-mono text-[11px] text-indigo-300">
                        ON {rule.triggerType}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                      <span className="px-2 py-0.5 rounded bg-slate-800 font-mono text-[11px] text-emerald-300">
                        DO {rule.actions?.[0]?.type || 'ACTION'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Executed</p>
                    <p className="text-sm font-bold text-white">{rule.executionCount} times</p>
                  </div>

                  <button
                    onClick={() => handleToggleRule(rule.id, rule.isActive)}
                    className="p-2 text-slate-400 hover:text-white transition-colors"
                  >
                    {rule.isActive ? (
                      <ToggleRight className="w-8 h-8 text-indigo-400" />
                    ) : (
                      <ToggleLeft className="w-8 h-8 text-slate-600" />
                    )}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Create Template Modal */}
      <Modal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        title="Create Task Template"
        description="Standardize recurring workflows with dynamic variables and checklists"
      >
        <form onSubmit={handleCreateTemplate} className="space-y-4">
          <Input
            label="Template Name"
            placeholder="e.g. Production Release Checklist"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            required
          />

          <Input
            label="Default Task Title"
            placeholder="Release v{{version}} on {{environment}}"
            value={defaultTitle}
            onChange={(e) => setDefaultTitle(e.target.value)}
            helperText="Use {{variable}} syntax for dynamic substitution"
            required
          />

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5 block">
              Default Body / Description
            </label>
            <textarea
              rows={3}
              value={defaultBody}
              onChange={(e) => setDefaultBody(e.target.value)}
              placeholder="Release deployment instructions..."
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-slate-100"
            />
          </div>

          <Input
            label="Variables (Comma-separated)"
            value={variablesInput}
            onChange={(e) => setVariablesInput(e.target.value)}
            helperText="e.g. version, environment, customer_name"
          />

          <Input
            label="Checklist Items (Comma-separated)"
            value={itemsInput}
            onChange={(e) => setItemsInput(e.target.value)}
            helperText="Checklist generated on task creation"
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsTemplateModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={submitting}>
              Save Template
            </Button>
          </div>
        </form>
      </Modal>

      {/* Create Rule Modal */}
      <Modal
        isOpen={isRuleModalOpen}
        onClose={() => setIsRuleModalOpen(false)}
        title="Create Automation Rule"
        description="Define trigger and automated actions when task events occur"
      >
        <form onSubmit={handleCreateRule} className="space-y-4">
          <Input
            label="Rule Name"
            placeholder="e.g. Notify on High-Priority Done"
            value={ruleName}
            onChange={(e) => setRuleName(e.target.value)}
            required
          />

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5 block">
              Trigger Event
            </label>
            <select
              value={triggerType}
              onChange={(e) => setTriggerType(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-slate-100"
            >
              <option value="TASK_STATUS_CHANGED">When Task Status Changes</option>
              <option value="TASK_CREATED">When Task is Created</option>
              <option value="TASK_ASSIGNED">When Task is Assigned</option>
              <option value="TASK_DUE_SOON">When Task Due Soon</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5 block">
              Action
            </label>
            <select
              value={actionType}
              onChange={(e) => setActionType(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-slate-100"
            >
              <option value="SEND_NOTIFICATION">Send Notification Alert</option>
              <option value="UPDATE_STATUS">Update Status</option>
              <option value="ASSIGN_USER">Assign User</option>
              <option value="ADD_LABEL">Add Label</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsRuleModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={submitting}>
              Save Rule
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
