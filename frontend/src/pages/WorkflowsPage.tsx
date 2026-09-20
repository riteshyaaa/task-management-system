import React, { useEffect, useState } from 'react';
import { GitBranch, Plus, ArrowRight, Shield, Bell, CheckCircle2 } from 'lucide-react';
import { useTeam } from '../context/TeamContext';
import { useToast } from '../context/ToastContext';
import { workflowService } from '../services/workflow.service';
import { WorkflowDefinition } from '../types/workflow.types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';

export const WorkflowsPage: React.FC = () => {
  const { currentTeam } = useTeam();
  const { showToast } = useToast();
  const [workflows, setWorkflows] = useState<WorkflowDefinition[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowDefinition | null>(null);
  const [loading, setLoading] = useState(true);

  // Create Workflow Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [statesInput, setStatesInput] = useState('Backlog, Development, Code Review, QA Testing, Deployed');
  const [submitting, setSubmitting] = useState(false);

  const loadWorkflows = async () => {
    if (!currentTeam) return;
    try {
      setLoading(true);
      const data = await workflowService.getWorkflows(currentTeam.id);
      setWorkflows(data);
      if (data.length > 0 && !selectedWorkflow) {
        setSelectedWorkflow(data[0]);
      }
    } catch (err) {
      console.error('Failed to load workflows:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkflows();
  }, [currentTeam?.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const handleCreateWorkflow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTeam || !name.trim()) return;

    try {
      setSubmitting(true);
      const stateNames = statesInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      if (stateNames.length < 2) {
        showToast('Please provide at least 2 states', 'warning');
        return;
      }

      const colors = ['#64748b', '#0284c7', '#7c3aed', '#d97706', '#059669', '#e11d48'];

      const states = stateNames.map((stName, idx) => ({
        name: stName,
        color: colors[idx % colors.length],
        isInitial: idx === 0,
        isTerminal: idx === stateNames.length - 1,
        positionX: idx * 220 + 50,
        positionY: 150,
      }));

      // Create linear sequential transitions
      const transitions = [];
      for (let i = 0; i < stateNames.length - 1; i++) {
        transitions.push({
          name: `Advance to ${stateNames[i + 1]}`,
          fromStateName: stateNames[i],
          toStateName: stateNames[i + 1],
          requiredRole: i === 2 ? 'MANAGER' : undefined,
        });
      }

      const created = await workflowService.createWorkflow({
        teamId: currentTeam.id,
        name,
        description,
        states,
        transitions,
      });

      showToast('Workflow state machine created!', 'success');
      setIsModalOpen(false);
      setName('');
      setDescription('');
      loadWorkflows();
      setSelectedWorkflow(created);
    } catch (err: any) {
      showToast(err.response?.data?.error?.message || 'Failed to create workflow', 'error');
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
            Workflow State Machines <GitBranch className="w-5 h-5 text-indigo-400" />
          </h1>
          <p className="text-xs text-slate-400">
            Define custom transitions, guard condition checks, and automated lifecycle hooks
          </p>
        </div>

        <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setIsModalOpen(true)}>
          New Workflow
        </Button>
      </div>

      {/* Main Grid: Workflow Selector + Visual State Diagram */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Col: Workflows List */}
        <div className="space-y-3">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
            Configured Pipelines ({workflows.length})
          </label>

          {workflows.length === 0 ? (
            <Card className="text-center py-8">
              <GitBranch className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-xs text-slate-400">No workflows configured yet</p>
            </Card>
          ) : (
            workflows.map((wf) => (
              <div
                key={wf.id}
                onClick={() => setSelectedWorkflow(wf)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                  selectedWorkflow?.id === wf.id
                    ? 'bg-indigo-950/40 border-indigo-500/50 shadow-lg shadow-indigo-500/10'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-sm font-bold text-white">{wf.name}</h3>
                  <Badge variant={wf.status === 'ACTIVE' ? 'success' : 'default'} size="sm">
                    {wf.status}
                  </Badge>
                </div>
                {wf.description && <p className="text-xs text-slate-400 line-clamp-2">{wf.description}</p>}
                <div className="flex items-center gap-3 mt-3 text-[11px] text-slate-500">
                  <span>{wf.states?.length || 0} States</span>
                  <span>•</span>
                  <span>{wf.transitions?.length || 0} Transitions</span>
                  <span>•</span>
                  <span>v{wf.version}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Right 2 Cols: Visual State Machine Graph & Transition Details */}
        <div className="lg:col-span-2 space-y-6">
          {selectedWorkflow ? (
            <>
              {/* Visual State Pipeline Viewer */}
              <Card>
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
                  <div>
                    <h2 className="text-base font-bold text-white">{selectedWorkflow.name} Pipeline</h2>
                    <p className="text-xs text-slate-400">{selectedWorkflow.description || 'Configured DAG state machine'}</p>
                  </div>
                  <Badge variant="primary" size="md">
                    VERSION {selectedWorkflow.version}
                  </Badge>
                </div>

                {/* States Flow Canvas */}
                <div className="p-6 rounded-2xl bg-slate-950/80 border border-slate-800/80 overflow-x-auto">
                  <div className="flex items-center gap-4 min-w-max">
                    {selectedWorkflow.states?.map((st, idx) => (
                      <React.Fragment key={st.id}>
                        <div
                          className="flex flex-col items-center justify-center p-4 rounded-xl border min-w-[140px] shadow-lg transition-transform hover:scale-105"
                          style={{
                            borderColor: `${st.color}50`,
                            backgroundColor: `${st.color}15`,
                          }}
                        >
                          <span
                            className="w-3 h-3 rounded-full mb-2"
                            style={{ backgroundColor: st.color }}
                          />
                          <p className="text-xs font-bold text-white text-center">{st.name}</p>
                          <span className="text-[9px] uppercase font-bold text-slate-400 mt-1">
                            {st.isInitial ? 'Initial State' : st.isTerminal ? 'Terminal State' : 'Intermediate'}
                          </span>
                        </div>

                        {idx < (selectedWorkflow.states?.length || 0) - 1 && (
                          <div className="flex flex-col items-center justify-center px-1 text-slate-600">
                            <ArrowRight className="w-5 h-5 text-indigo-400" />
                          </div>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              </Card>

              {/* Guard Conditions & Hooks List */}
              <Card>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-4 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-indigo-400" /> Transition Guard Rules & Side-Effect Hooks
                </h3>

                <div className="space-y-3">
                  {selectedWorkflow.transitions?.map((trans) => (
                    <div
                      key={trans.id}
                      className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">{trans.name}</span>
                          <span className="text-xs text-slate-500">
                            ({trans.fromState?.name} → {trans.toState?.name})
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mt-1.5">
                          {trans.requiredRole && (
                            <Badge variant="warning" size="sm">
                              Required Role: {trans.requiredRole}
                            </Badge>
                          )}
                          <Badge variant="purple" size="sm">
                            <Bell className="w-3 h-3" /> Auto-Notify Assignee
                          </Badge>
                        </div>
                      </div>

                      <Badge variant="success" size="sm">
                        <CheckCircle2 className="w-3 h-3" /> DAG Validated
                      </Badge>
                    </div>
                  ))}
                </div>
              </Card>
            </>
          ) : (
            <Card className="text-center py-16">
              <p className="text-sm text-slate-400">Select a workflow to inspect its state machine</p>
            </Card>
          )}
        </div>
      </div>

      {/* Create Workflow Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create Custom Workflow"
        description="Design a validated DAG state machine with automated transitions"
      >
        <form onSubmit={handleCreateWorkflow} className="space-y-4">
          <Input
            label="Workflow Name"
            placeholder="e.g. Enterprise Feature Delivery"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5 block">
              Description
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the governance process..."
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-slate-100"
            />
          </div>

          <Input
            label="Pipeline States (Comma-separated order)"
            value={statesInput}
            onChange={(e) => setStatesInput(e.target.value)}
            helperText="Initial state first, terminal state last"
            required
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={submitting}>
              Create Workflow
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
