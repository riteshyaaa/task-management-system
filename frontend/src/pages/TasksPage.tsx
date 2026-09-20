import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Plus,
  Search,
  Calendar,
  User as UserIcon,
  MessageSquare,
  Send,
  X,
  Sparkles,
  CheckSquare,
  Layers,
} from 'lucide-react';
import { useTeam } from '../context/TeamContext';
import { useToast } from '../context/ToastContext';
import { taskService } from '../services/task.service';
import { templateService } from '../services/template.service';
import { Task, TaskPriority, TaskStatus, TaskComment } from '../types/task.types';
import { TaskTemplate } from '../types/template.types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { formatDate, formatRelativeTime } from '../utils/formatters';

const COLUMNS: { id: TaskStatus; label: string; color: string }[] = [
  { id: 'TODO', label: 'To Do', color: 'border-slate-700' },
  { id: 'IN_PROGRESS', label: 'In Progress', color: 'border-sky-500/40' },
  { id: 'REVIEW', label: 'In Review', color: 'border-purple-500/40' },
  { id: 'DONE', label: 'Done', color: 'border-emerald-500/40' },
];

export const TasksPage: React.FC = () => {
  const { currentTeam, teamMembers } = useTeam();
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');

  // Create Task Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<TaskPriority>('MEDIUM');
  const [newTaskAssigneeId, setNewTaskAssigneeId] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [newTaskEstimatedHours, setNewTaskEstimatedHours] = useState('');
  const [templateVariables, setTemplateVariables] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Selected Task Drawer state
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  // Check URL params for create action
  useEffect(() => {
    if (searchParams.get('create') === 'true') {
      setIsCreateModalOpen(true);
      searchParams.delete('create');
      setSearchParams(searchParams);
    }
  }, [searchParams, setSearchParams]);

  // Load tasks & templates
  const loadTasks = async () => {
    if (!currentTeam) return;
    try {
      setLoading(true);
      const res = await taskService.getTasks({ teamId: currentTeam.id, limit: 100 });
      setTasks(res.tasks);
    } catch (err) {
      console.error('Failed to load tasks:', err);
      showToast('Failed to load tasks', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
    if (currentTeam) {
      templateService
        .getTemplates(currentTeam.id)
        .then(setTemplates)
        .catch((err) => console.error('Failed to load templates:', err));
    }
  }, [currentTeam?.id]);

  // Handle Template selection change
  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (!templateId) return;

    const t = templates.find((tpl) => tpl.id === templateId);
    if (t) {
      setNewTaskTitle(t.defaultTitle);
      setNewTaskDescription(t.defaultBody || '');
      setNewTaskPriority(t.defaultPriority);
      if (t.estimatedHours) setNewTaskEstimatedHours(String(t.estimatedHours));
      const vars: Record<string, string> = {};
      t.variables?.forEach((v) => {
        vars[v.name] = v.defaultValue || '';
      });
      setTemplateVariables(vars);
    }
  };

  // Create Task Submission
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTeam || !newTaskTitle.trim()) return;

    try {
      setSubmitting(true);
      if (selectedTemplateId) {
        // Instantiate template
        await templateService.instantiateTemplate(selectedTemplateId, {
          teamId: currentTeam.id,
          variables: templateVariables,
          assigneeId: newTaskAssigneeId || undefined,
          dueDate: newTaskDueDate || undefined,
        });
        showToast('Task generated from template successfully!', 'success');
      } else {
        await taskService.createTask(currentTeam.id, {
          title: newTaskTitle,
          description: newTaskDescription,
          priority: newTaskPriority,
          assigneeId: newTaskAssigneeId || undefined,
          dueDate: newTaskDueDate || undefined,
          estimatedHours: newTaskEstimatedHours ? Number(newTaskEstimatedHours) : undefined,
        });
        showToast('Task created successfully!', 'success');
      }

      setIsCreateModalOpen(false);
      resetCreateForm();
      loadTasks();
    } catch (err: any) {
      showToast(err.response?.data?.error?.message || 'Failed to create task', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const resetCreateForm = () => {
    setSelectedTemplateId('');
    setNewTaskTitle('');
    setNewTaskDescription('');
    setNewTaskPriority('MEDIUM');
    setNewTaskAssigneeId('');
    setNewTaskDueDate('');
    setNewTaskEstimatedHours('');
    setTemplateVariables({});
  };

  // Move Task Status (Optimistic UI)
  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === newStatus) return;

    const previousStatus = task.status;
    const previousVersion = task.version;

    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus, version: t.version + 1 } : t))
    );
    if (selectedTask?.id === taskId) {
      setSelectedTask((prev) => (prev ? { ...prev, status: newStatus, version: prev.version + 1 } : null));
    }

    try {
      await taskService.updateTask(taskId, {
        status: newStatus,
        version: previousVersion, // Pass OCC version
      });
      showToast(`Moved to ${newStatus.replace('_', ' ')}`, 'success');
    } catch (err: any) {
      // Rollback on conflict or failure
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: previousStatus, version: previousVersion } : t))
      );
      if (selectedTask?.id === taskId) {
        setSelectedTask((prev) => (prev ? { ...prev, status: previousStatus, version: previousVersion } : null));
      }
      showToast(err.response?.data?.error?.message || 'Failed to update task status (OCC Conflict)', 'error');
    }
  };

  // Open Task Detail Drawer
  const openTaskDrawer = async (task: Task) => {
    setSelectedTask(task);
    try {
      const fullTask = await taskService.getTaskById(task.id);
      setSelectedTask(fullTask);
      const commentsList = await taskService.getComments(task.id);
      setComments(commentsList);
    } catch (err) {
      console.error('Failed to load task details:', err);
    }
  };

  // Add Comment
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || !newComment.trim()) return;

    try {
      const added = await taskService.addComment(selectedTask.id, newComment);
      setComments((prev) => [...prev, added]);
      setNewComment('');
      showToast('Comment added', 'success');
    } catch (err) {
      showToast('Failed to add comment', 'error');
    }
  };

  // Add Subtask
  const handleAddSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || !newSubtaskTitle.trim()) return;

    try {
      const added = await taskService.addSubtask(selectedTask.id, { title: newSubtaskTitle });
      setSelectedTask((prev) =>
        prev ? { ...prev, subtasks: [...(prev.subtasks || []), added] } : null
      );
      setNewSubtaskTitle('');
      showToast('Subtask added', 'success');
    } catch (err) {
      showToast('Failed to add subtask', 'error');
    }
  };

  // Toggle Subtask Status
  const handleToggleSubtask = async (subtaskId: string, currentStatus: TaskStatus) => {
    if (!selectedTask) return;
    const nextStatus = currentStatus === 'DONE' ? 'TODO' : 'DONE';

    try {
      await taskService.updateSubtask(selectedTask.id, subtaskId, { status: nextStatus });
      setSelectedTask((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          subtasks: prev.subtasks?.map((s) => (s.id === subtaskId ? { ...s, status: nextStatus } : s)),
        };
      });
    } catch (err) {
      showToast('Failed to update subtask', 'error');
    }
  };

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesSearch =
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        `TASK-${task.taskNumber}`.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesPriority = priorityFilter === 'ALL' || task.priority === priorityFilter;

      return matchesSearch && matchesPriority;
    });
  }, [tasks, searchQuery, priorityFilter]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            Kanban Board <Layers className="w-5 h-5 text-indigo-400" />
          </h1>
          <p className="text-xs text-slate-400">Manage, organize, and orchestrate tasks in real time</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-48 sm:w-64">
            <Input
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search className="w-4 h-4" />}
            />
          </div>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 cursor-pointer"
          >
            <option value="ALL">All Priorities</option>
            <option value="URGENT">Urgent</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setIsCreateModalOpen(true)}>
            Add Task
          </Button>
        </div>
      </div>

      {/* Kanban Board Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 items-start">
        {COLUMNS.map((col) => {
          const colTasks = filteredTasks.filter((t) => t.status === col.id);

          return (
            <div
              key={col.id}
              className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4 flex flex-col min-h-[550px] backdrop-blur-sm"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800/80">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      col.id === 'TODO'
                        ? 'bg-slate-400'
                        : col.id === 'IN_PROGRESS'
                        ? 'bg-sky-400'
                        : col.id === 'REVIEW'
                        ? 'bg-purple-400'
                        : 'bg-emerald-400'
                    }`}
                  />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">{col.label}</h3>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-slate-800 text-[11px] font-bold text-slate-300">
                  {colTasks.length}
                </span>
              </div>

              {/* Tasks List */}
              <div className="space-y-3 flex-1 overflow-y-auto">
                {colTasks.map((task) => (
                  <div
                    key={task.id}
                    onClick={() => openTaskDrawer(task)}
                    className="group p-4 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-indigo-500/50 hover:shadow-lg hover:shadow-indigo-500/5 transition-all cursor-pointer relative"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="text-[10px] font-mono font-bold text-indigo-400">
                        TASK-{task.taskNumber}
                      </span>
                      <Badge
                        variant={
                          task.priority === 'URGENT'
                            ? 'danger'
                            : task.priority === 'HIGH'
                            ? 'warning'
                            : task.priority === 'MEDIUM'
                            ? 'primary'
                            : 'default'
                        }
                        size="sm"
                      >
                        {task.priority}
                      </Badge>
                    </div>

                    <h4 className="text-xs font-semibold text-white leading-snug line-clamp-2 group-hover:text-indigo-200 transition-colors">
                      {task.title}
                    </h4>

                    {task.description && (
                      <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                        {task.description}
                      </p>
                    )}

                    {/* Task Footer */}
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400">
                      <div className="flex items-center gap-2">
                        {task.dueDate && (
                          <div className="flex items-center gap-1 text-slate-400">
                            <Calendar className="w-3 h-3" />
                            <span>{formatDate(task.dueDate)}</span>
                          </div>
                        )}
                        {(task._count?.subtasks ?? 0) > 0 && (
                          <div className="flex items-center gap-1 text-slate-400">
                            <CheckSquare className="w-3 h-3" />
                            <span>{task._count?.subtasks}</span>
                          </div>
                        )}
                      </div>

                      {task.assignee ? (
                        <div
                          className="w-6 h-6 rounded-full bg-gradient-to-tr from-indigo-500 to-pink-500 flex items-center justify-center font-bold text-[10px] text-white"
                          title={`${task.assignee.firstName || ''} ${task.assignee.lastName || ''}`}
                        >
                          {(task.assignee.firstName || 'U').charAt(0).toUpperCase()}
                        </div>
                      ) : (
                        <UserIcon className="w-4 h-4 text-slate-600" />
                      )}
                    </div>

                    {/* Quick Move Trigger Bar */}
                    <div className="hidden group-hover:flex items-center justify-end gap-1 mt-2 pt-2 border-t border-slate-800/60">
                      {COLUMNS.filter((c) => c.id !== task.status).map((targetCol) => (
                        <button
                          key={targetCol.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStatusChange(task.id, targetCol.id);
                          }}
                          className="px-2 py-0.5 rounded text-[9px] font-semibold bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white transition-colors"
                        >
                          → {targetCol.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Task Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          resetCreateForm();
        }}
        title="Create New Task"
        description="Add a standalone task or generate from a predefined template"
        maxWidth="2xl"
      >
        <form onSubmit={handleCreateTask} className="space-y-4">
          {/* Template Picker */}
          {templates.length > 0 && (
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5 block">
                Load from Template
              </label>
              <select
                value={selectedTemplateId}
                onChange={(e) => handleTemplateSelect(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:ring-2 focus:ring-indigo-500/50 cursor-pointer"
              >
                <option value="">-- Blank Task (Custom) --</option>
                {templates.map((tpl) => (
                  <option key={tpl.id} value={tpl.id}>
                    {tpl.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Template Variables (if template selected) */}
          {selectedTemplateId && Object.keys(templateVariables).length > 0 && (
            <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-500/20 space-y-3">
              <p className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Template Parameters
              </p>
              {Object.keys(templateVariables).map((varKey) => (
                <Input
                  key={varKey}
                  label={`Variable: {{${varKey}}}`}
                  value={templateVariables[varKey]}
                  onChange={(e) =>
                    setTemplateVariables({ ...templateVariables, [varKey]: e.target.value })
                  }
                  required
                />
              ))}
            </div>
          )}

          <Input
            label="Title"
            placeholder="e.g. Implement OAuth 2.0 PKCE flow"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            required
          />

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5 block">
              Description (Markdown supported)
            </label>
            <textarea
              rows={3}
              value={newTaskDescription}
              onChange={(e) => setNewTaskDescription(e.target.value)}
              placeholder="Provide context, acceptance criteria, or reproduction steps..."
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5 block">
                Priority
              </label>
              <select
                value={newTaskPriority}
                onChange={(e) => setNewTaskPriority(e.target.value as TaskPriority)}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-slate-100"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5 block">
                Assignee
              </label>
              <select
                value={newTaskAssigneeId}
                onChange={(e) => setNewTaskAssigneeId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-slate-100"
              >
                <option value="">Unassigned</option>
                {teamMembers.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.user?.firstName || 'Member'} {m.user?.lastName || ''}
                  </option>
                ))}
              </select>
            </div>

            <Input
              label="Due Date"
              type="date"
              value={newTaskDueDate}
              onChange={(e) => setNewTaskDueDate(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsCreateModalOpen(false);
                resetCreateForm();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={submitting}>
              Create Task
            </Button>
          </div>
        </form>
      </Modal>

      {/* Task Detail Drawer */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm animate-fade-in"
            onClick={() => setSelectedTask(null)}
          />

          <div className="relative w-full max-w-xl bg-slate-900 border-l border-slate-800 h-full overflow-y-auto p-6 sm:p-8 z-10 animate-slide-up flex flex-col justify-between">
            <div className="space-y-6">
              {/* Drawer Header */}
              <div className="flex items-start justify-between pb-4 border-b border-slate-800">
                <div>
                  <span className="text-xs font-mono font-bold text-indigo-400">
                    TASK-{selectedTask.taskNumber}
                  </span>
                  <h2 className="text-lg font-bold text-white mt-1">{selectedTask.title}</h2>
                </div>
                <button
                  onClick={() => setSelectedTask(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Status & Priority Control */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 block">
                    Status
                  </label>
                  <select
                    value={selectedTask.status}
                    onChange={(e) => handleStatusChange(selectedTask.id, e.target.value as TaskStatus)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-white"
                  >
                    <option value="TODO">To Do</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="REVIEW">In Review</option>
                    <option value="DONE">Done</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 block">
                    Priority
                  </label>
                  <Badge
                    variant={
                      selectedTask.priority === 'URGENT'
                        ? 'danger'
                        : selectedTask.priority === 'HIGH'
                        ? 'warning'
                        : selectedTask.priority === 'MEDIUM'
                        ? 'primary'
                        : 'default'
                    }
                    className="mt-1"
                  >
                    {selectedTask.priority}
                  </Badge>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 block">
                  Description
                </label>
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {selectedTask.description || 'No description provided.'}
                </div>
              </div>

              {/* Subtasks Checklist */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center justify-between">
                  <span>Subtasks & Checklist</span>
                  <span>{selectedTask.subtasks?.length || 0} items</span>
                </label>

                <div className="space-y-2 mb-3">
                  {selectedTask.subtasks?.map((sub) => (
                    <div
                      key={sub.id}
                      onClick={() => handleToggleSubtask(sub.id, sub.status)}
                      className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-950/40 border border-slate-800/80 hover:border-slate-700 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={sub.status === 'DONE'}
                        readOnly
                        className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 bg-slate-900"
                      />
                      <span
                        className={`text-xs ${
                          sub.status === 'DONE' ? 'line-through text-slate-500' : 'text-slate-200'
                        }`}
                      >
                        {sub.title}
                      </span>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleAddSubtask} className="flex gap-2">
                  <Input
                    placeholder="Add checklist item..."
                    value={newSubtaskTitle}
                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                  />
                  <Button type="submit" size="sm" variant="secondary">
                    Add
                  </Button>
                </form>
              </div>

              {/* Comments Thread */}
              <div className="pt-4 border-t border-slate-800">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                  <MessageSquare className="w-3.5 h-3.5" /> Comments & Activity ({comments.length})
                </label>

                <div className="space-y-3 mb-4 max-h-56 overflow-y-auto pr-1">
                  {comments.length === 0 ? (
                    <p className="text-xs text-slate-500 py-2">No comments yet. Start the conversation!</p>
                  ) : (
                    comments.map((c) => (
                      <div key={c.id} className="p-3 rounded-xl bg-slate-950/50 border border-slate-800 text-xs">
                        <div className="flex items-center justify-between mb-1 text-[10px] text-slate-400">
                          <span className="font-semibold text-slate-200">
                            {c.user?.firstName} {c.user?.lastName}
                          </span>
                          <span>{formatRelativeTime(c.createdAt)}</span>
                        </div>
                        <p className="text-slate-300 leading-relaxed">{c.content}</p>
                      </div>
                    ))
                  )}
                </div>

                <form onSubmit={handleAddComment} className="flex gap-2">
                  <Input
                    placeholder="Write a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                  />
                  <Button type="submit" size="sm" variant="primary" rightIcon={<Send className="w-3.5 h-3.5" />}>
                    Send
                  </Button>
                </form>
              </div>
            </div>

            {/* OCC Version Banner */}
            <div className="pt-6 border-t border-slate-800 text-[10px] text-slate-500 flex items-center justify-between">
              <span>Optimistic Concurrency Version: v{selectedTask.version}</span>
              <span>Updated {formatRelativeTime(selectedTask.updatedAt)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
