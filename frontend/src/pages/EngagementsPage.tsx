import React, { useEffect, useState, useMemo } from 'react';
import {
  Briefcase,
  Plus,
  Search,
  Calendar,
  User,
  CheckCircle2,
  Edit2,
  Trash2,
  Sparkles,
  ArrowUpRight,
  CheckCircle,
  RefreshCw
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { engagementService } from '../services/engagement.service';
import { serviceTypeService } from '../services/service-type.service';
import { templateService } from '../services/template.service';
import { Engagement, EngagementStatus } from '../types/engagement.types';
import { ServiceType } from '../types/service-type.types';
import { TaskTemplate } from '../types/template.types';
import { useClient } from '../context/ClientContext';
import { useToast } from '../context/ToastContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { formatDate } from '../utils/formatters';

export const EngagementsPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { clients, currentClient, clientMembers } = useClient();

  const [engagements, setEngagements] = useState<Engagement[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | EngagementStatus>('ALL');
  const [selectedServiceTypeId, setSelectedServiceTypeId] = useState<string>('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [clientId, setClientId] = useState<string>('');
  const [serviceTypeId, setServiceTypeId] = useState<string>('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [managerId, setManagerId] = useState<string>('');
  const [templateId, setTemplateId] = useState<string>('');
  const [autoGenerateTasks, setAutoGenerateTasks] = useState(true);
  const [assigneeId, setAssigneeId] = useState<string>('');
  const [status, setStatus] = useState<EngagementStatus>('ACTIVE');
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [engRes, stRes] = await Promise.all([
        engagementService.listEngagements({
          clientId: currentClient?.id
        }),
        serviceTypeService.listServiceTypes({ isActive: true })
      ]);
      setEngagements(engRes.items);
      setServiceTypes(stRes.items);
    } catch (err: any) {
      console.error('Failed to load engagements data:', err);
      showToast('Failed to load engagements', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentClient?.id]);

  useEffect(() => {
    if (clientId || currentClient?.id) {
      const activeCId = clientId || currentClient?.id;
      if (activeCId) {
        templateService.getTemplates(activeCId).then(setTemplates).catch(console.error);
      }
    }
  }, [clientId, currentClient?.id]);

  const openCreateModal = () => {
    setEditingId(null);
    const cId = currentClient?.id || (clients[0]?.id || '');
    setClientId(cId);
    const sId = serviceTypes[0]?.id || '';
    setServiceTypeId(sId);

    // Auto-generate suggested title if service type is present
    const stObj = serviceTypes.find(s => s.id === sId);
    const clObj = clients.find(c => c.id === cId);
    const now = new Date();
    const monthYear = now.toLocaleString('default', { month: 'short', year: 'numeric' });
    if (stObj && clObj) {
      setTitle(`${clObj.name} - ${stObj.name} (${monthYear})`);
    } else {
      setTitle('');
    }

    setDescription('');

    // Default current month range
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    setPeriodStart(firstDay);
    setPeriodEnd(lastDay);
    setDueDate(lastDay);
    setManagerId('');
    setTemplateId('');
    setAutoGenerateTasks(true);
    setAssigneeId('');
    setStatus('ACTIVE');
    setIsModalOpen(true);
  };

  const openEditModal = (eng: Engagement) => {
    setEditingId(eng.id);
    setClientId(eng.clientId);
    setServiceTypeId(eng.serviceTypeId);
    setTitle(eng.title);
    setDescription(eng.description || '');
    setPeriodStart(eng.periodStart ? eng.periodStart.split('T')[0] : '');
    setPeriodEnd(eng.periodEnd ? eng.periodEnd.split('T')[0] : '');
    setDueDate(eng.dueDate ? eng.dueDate.split('T')[0] : '');
    setManagerId(eng.managerId || '');
    setStatus(eng.status);
    setIsModalOpen(true);
  };

  const handleServiceTypeChange = (newStId: string) => {
    setServiceTypeId(newStId);
    const stObj = serviceTypes.find(s => s.id === newStId);
    const clObj = clients.find(c => c.id === clientId);
    if (stObj && clObj && !editingId) {
      const now = new Date(periodStart || Date.now());
      const monthYear = now.toLocaleString('default', { month: 'short', year: 'numeric' });
      setTitle(`${clObj.name} - ${stObj.name} (${monthYear})`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !clientId || !serviceTypeId || !periodStart || !periodEnd) {
      showToast('Please fill in all required fields', 'error');
      return;
    }

    try {
      setSubmitting(true);
      if (editingId) {
        await engagementService.updateEngagement(editingId, {
          title: title.trim(),
          description: description.trim() || null,
          status,
          periodStart: new Date(periodStart).toISOString(),
          periodEnd: new Date(periodEnd).toISOString(),
          dueDate: dueDate ? new Date(dueDate).toISOString() : null,
          managerId: managerId || null
        });
        showToast('Engagement updated successfully', 'success');
      } else {
        await engagementService.createEngagement({
          clientId,
          serviceTypeId,
          title: title.trim(),
          description: description.trim() || null,
          status,
          periodStart: new Date(periodStart).toISOString(),
          periodEnd: new Date(periodEnd).toISOString(),
          dueDate: dueDate ? new Date(dueDate).toISOString() : null,
          managerId: managerId || null,
          templateId: templateId || undefined,
          autoGenerateTasks,
          assigneeId: assigneeId || undefined
        });
        showToast('Engagement created successfully with deliverables', 'success');
      }
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || err.response?.data?.message || 'Failed to save engagement';
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete engagement "${title}"?`)) return;
    try {
      await engagementService.deleteEngagement(id);
      showToast('Engagement deleted', 'success');
      loadData();
    } catch (err: any) {
      showToast(err.response?.data?.error?.message || 'Failed to delete engagement', 'error');
    }
  };

  const handleQuickStatus = async (eng: Engagement, newStatus: EngagementStatus) => {
    try {
      await engagementService.updateEngagement(eng.id, { status: newStatus });
      showToast(`Engagement marked as ${newStatus.toLowerCase()}`, 'success');
      loadData();
    } catch (err: any) {
      showToast('Failed to update status', 'error');
    }
  };

  const filteredEngagements = useMemo(() => {
    return engagements.filter((eng) => {
      const matchesSearch =
        eng.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (eng.description && eng.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (eng.serviceType?.name && eng.serviceType.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (eng.client?.name && eng.client.name.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus = statusFilter === 'ALL' || eng.status === statusFilter;
      const matchesServiceType =
        selectedServiceTypeId === 'ALL' || eng.serviceTypeId === selectedServiceTypeId;

      return matchesSearch && matchesStatus && matchesServiceType;
    });
  }, [engagements, searchQuery, statusFilter, selectedServiceTypeId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            Engagements <Briefcase className="w-5 h-5 text-indigo-400" />
          </h1>
          <p className="text-xs text-slate-400">
            Manage client deliverables, recurring periods, SLAs, and execution progress
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-48 sm:w-64">
            <Input
              placeholder="Search engagements..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search className="w-4 h-4" />}
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          {serviceTypes.length > 0 && (
            <select
              value={selectedServiceTypeId}
              onChange={(e) => setSelectedServiceTypeId(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 cursor-pointer max-w-[160px] truncate"
            >
              <option value="ALL">All Services</option>
              {serviceTypes.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.name}
                </option>
              ))}
            </select>
          )}

          <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />} onClick={openCreateModal}>
            New Engagement
          </Button>
        </div>
      </div>

      {/* Grid of Engagements */}
      {filteredEngagements.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-slate-800">
          <Briefcase className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-white">No engagements found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {searchQuery
              ? 'Try adjusting your search query or filters.'
              : 'Create a new engagement to track client deliverables with automated task templating and SLAs.'}
          </p>
          {!searchQuery && (
            <Button variant="primary" size="sm" className="mt-4" onClick={openCreateModal}>
              Create Engagement
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredEngagements.map((eng) => {
            const total = eng.totalTasks ?? eng.tasks?.length ?? 0;
            const completed = eng.completedTasks ?? eng.tasks?.filter((t: any) => t.status === 'COMPLETED' || t.status === 'DONE').length ?? 0;
            const progress = eng.progressPercentage ?? eng.progressPercent ?? (total > 0 ? Math.round((completed / total) * 100) : 0);

            return (
              <Card key={eng.id} hover className="flex flex-col justify-between">
                <div>
                  {/* Top Bar: Service Type & Status Badge */}
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400 bg-indigo-950/80 border border-indigo-500/30 px-2 py-0.5 rounded-md">
                        {eng.serviceType?.name || 'Service'}
                      </span>
                      {eng.client && (
                        <span className="text-[11px] font-medium text-slate-400">
                          &bull; {eng.client.name}
                        </span>
                      )}
                    </div>

                    <Badge
                      variant={
                        eng.status === 'COMPLETED'
                          ? 'success'
                          : eng.status === 'ACTIVE'
                          ? 'primary'
                          : 'default'
                      }
                      size="sm"
                    >
                      {eng.status}
                    </Badge>
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-sm font-bold text-white mb-1.5 leading-snug line-clamp-2">
                    {eng.title}
                  </h3>
                  {eng.description && (
                    <p className="text-xs text-slate-300 line-clamp-2 mb-3 leading-relaxed">
                      {eng.description}
                    </p>
                  )}

                  {/* Progress Bar */}
                  <div className="mt-3 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-slate-400 flex items-center gap-1 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" /> Deliverables
                      </span>
                      <span className="font-bold text-slate-200">
                        {completed} / {total} ({progress}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 rounded-full ${
                          progress === 100
                            ? 'bg-emerald-500'
                            : progress > 50
                            ? 'bg-indigo-500'
                            : 'bg-amber-500'
                        }`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Period & Manager Details */}
                  <div className="mt-3 space-y-1.5 text-xs text-slate-400 border-t border-slate-800/60 pt-3">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" /> Period:
                      </span>
                      <span className="text-slate-300 font-mono text-[11px]">
                        {formatDate(eng.periodStart)} - {formatDate(eng.periodEnd)}
                      </span>
                    </div>

                    {eng.manager && (
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-500" /> Manager:
                        </span>
                        <span className="text-slate-300 font-medium">
                          {eng.manager.firstName} {eng.manager.lastName}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-slate-800/80">
                  <div className="flex items-center gap-1">
                    {eng.status === 'ACTIVE' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/30 text-xs px-2"
                        onClick={() => handleQuickStatus(eng, 'COMPLETED')}
                      >
                        <CheckCircle className="w-3.5 h-3.5 mr-1" /> Complete
                      </Button>
                    )}
                    {eng.status === 'COMPLETED' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-indigo-400 hover:text-indigo-300 hover:bg-indigo-950/30 text-xs px-2"
                        onClick={() => handleQuickStatus(eng, 'ACTIVE')}
                      >
                        <RefreshCw className="w-3.5 h-3.5 mr-1" /> Reopen
                      </Button>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      className="px-2 text-xs"
                      onClick={() => navigate(`/tasks?engagementId=${eng.id}`)}
                    >
                      Tasks <ArrowUpRight className="w-3 h-3 ml-1" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="px-2"
                      onClick={() => openEditModal(eng)}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 px-2"
                      onClick={() => handleDelete(eng.id, eng.title)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? 'Edit Engagement' : 'Create Engagement'}
        description="Configure client deliverable period, service type, and automated task instantiation"
        maxWidth="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5 block">
                Client Organization *
              </label>
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                disabled={!!editingId}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:ring-2 focus:ring-indigo-500/50"
                required
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5 block">
                Service Catalog Type *
              </label>
              <select
                value={serviceTypeId}
                onChange={(e) => handleServiceTypeChange(e.target.value)}
                disabled={!!editingId}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:ring-2 focus:ring-indigo-500/50"
                required
              >
                {serviceTypes.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.name} ({st.defaultCadence})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <Input
            label="Engagement Title *"
            placeholder="e.g. Acme Corp - Monthly Bookkeeping (Oct 2026)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5 block">
              Description / Scope
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Scope details, deliverables expectations, notes..."
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="Period Start *"
              type="date"
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
              required
            />
            <Input
              label="Period End *"
              type="date"
              value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
              required
            />
            <Input
              label="Deliverable Due Date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5 block">
                Engagement Manager
              </label>
              <select
                value={managerId}
                onChange={(e) => setManagerId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:ring-2 focus:ring-indigo-500/50"
              >
                <option value="">Unassigned Manager</option>
                {clientMembers.map((m) => (
                  <option key={m.id} value={m.userId}>
                    {m.user?.firstName} {m.user?.lastName} ({m.role})
                  </option>
                ))}
              </select>
            </div>

            {editingId ? (
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5 block">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as EngagementStatus)}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:ring-2 focus:ring-indigo-500/50"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="COMPLETED">COMPLETED</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
              </div>
            ) : (
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5 block">
                  Initial Task Template
                </label>
                <select
                  value={templateId}
                  onChange={(e) => setTemplateId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:ring-2 focus:ring-indigo-500/50"
                >
                  <option value="">Auto-select service template</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {!editingId && (
            <div className="p-3 bg-indigo-950/40 border border-indigo-500/20 rounded-xl space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="autoTasksToggle"
                  checked={autoGenerateTasks}
                  onChange={(e) => setAutoGenerateTasks(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 bg-slate-950"
                />
                <label htmlFor="autoTasksToggle" className="text-xs font-semibold text-indigo-200 cursor-pointer flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> Auto-instantiate deliverable tasks from template
                </label>
              </div>
              <p className="text-[11px] text-slate-400 pl-6">
                Automatically interpolates variables like {'{{client_name}}'}, {'{{period_start}}'}, and {'{{period_end}}'} into task titles and descriptions.
              </p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={submitting}>
              {editingId ? 'Save Changes' : 'Create Engagement'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
