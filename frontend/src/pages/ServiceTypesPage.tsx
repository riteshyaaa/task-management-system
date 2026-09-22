import React, { useEffect, useState, useMemo } from 'react';
import {
  Wrench,
  Plus,
  Search,
  Clock,
  Repeat,
  Edit2,
  Trash2,
  Briefcase,
  Layers,
  Sparkles
} from 'lucide-react';
import { serviceTypeService } from '../services/service-type.service';
import { ServiceType, RecurrenceFrequency } from '../types/service-type.types';
import { useToast } from '../context/ToastContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { formatDate } from '../utils/formatters';

const CADENCE_OPTIONS: { value: RecurrenceFrequency; label: string }[] = [
  { value: 'DAILY', label: 'Daily' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'YEARLY', label: 'Yearly' },
  { value: 'CUSTOM_CRON', label: 'Custom Cron' }
];

export const ServiceTypesPage: React.FC = () => {
  const { showToast } = useToast();
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [defaultCadence, setDefaultCadence] = useState<RecurrenceFrequency>('MONTHLY');
  const [estimatedHours, setEstimatedHours] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadServiceTypes = async () => {
    try {
      setLoading(true);
      const res = await serviceTypeService.listServiceTypes();
      setServiceTypes(res.items);
    } catch (err: any) {
      console.error('Failed to load service types:', err);
      showToast('Failed to load service catalog', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadServiceTypes();
  }, []);

  const openCreateModal = () => {
    setEditingId(null);
    setName('');
    setDescription('');
    setDefaultCadence('MONTHLY');
    setEstimatedHours('');
    setIsActive(true);
    setIsModalOpen(true);
  };

  const openEditModal = (st: ServiceType) => {
    setEditingId(st.id);
    setName(st.name);
    setDescription(st.description || '');
    setDefaultCadence(st.defaultCadence);
    setEstimatedHours(st.estimatedHours ? String(st.estimatedHours) : '');
    setIsActive(st.isActive);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setSubmitting(true);
      if (editingId) {
        await serviceTypeService.updateServiceType(editingId, {
          name: name.trim(),
          description: description.trim() || null,
          defaultCadence,
          estimatedHours: estimatedHours ? Number(estimatedHours) : null,
          isActive
        });
        showToast('Service type updated successfully', 'success');
      } else {
        await serviceTypeService.createServiceType({
          name: name.trim(),
          description: description.trim() || null,
          defaultCadence,
          estimatedHours: estimatedHours ? Number(estimatedHours) : null,
          isActive
        });
        showToast('Service type created successfully', 'success');
      }
      setIsModalOpen(false);
      loadServiceTypes();
    } catch (err: any) {
      showToast(err.response?.data?.error?.message || 'Failed to save service type', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;
    try {
      await serviceTypeService.deleteServiceType(id);
      showToast('Service type deleted', 'success');
      loadServiceTypes();
    } catch (err: any) {
      showToast(err.response?.data?.error?.message || 'Failed to delete service type', 'error');
    }
  };

  const filteredServiceTypes = useMemo(() => {
    return serviceTypes.filter((st) => {
      const matchesSearch =
        st.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (st.description && st.description.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && st.isActive) ||
        (statusFilter === 'INACTIVE' && !st.isActive);

      return matchesSearch && matchesStatus;
    });
  }, [serviceTypes, searchQuery, statusFilter]);

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
            Service Catalog <Wrench className="w-5 h-5 text-indigo-400" />
          </h1>
          <p className="text-xs text-slate-400">
            Define standardized professional service types, cadences, and templates
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-48 sm:w-64">
            <Input
              placeholder="Search services..."
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
            <option value="ACTIVE">Active Only</option>
            <option value="INACTIVE">Inactive Only</option>
          </select>

          <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />} onClick={openCreateModal}>
            Add Service Type
          </Button>
        </div>
      </div>

      {/* Grid of Service Types */}
      {filteredServiceTypes.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-slate-800">
          <Wrench className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-white">No service types found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {searchQuery
              ? 'Try adjusting your search query or status filter.'
              : 'Create your first service catalog offering to start generating recurring client engagements.'}
          </p>
          {!searchQuery && (
            <Button variant="primary" size="sm" className="mt-4" onClick={openCreateModal}>
              Create Service Type
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredServiceTypes.map((st) => (
            <Card key={st.id} hover className="flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-950/80 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                      <Briefcase className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">{st.name}</h3>
                      <span className="text-[10px] text-slate-400 font-mono">
                        Created {formatDate(st.createdAt)}
                      </span>
                    </div>
                  </div>

                  <Badge variant={st.isActive ? 'success' : 'default'} size="sm">
                    {st.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>

                {st.description && (
                  <p className="text-xs text-slate-300 leading-relaxed mb-4 line-clamp-2">
                    {st.description}
                  </p>
                )}

                <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-800/80 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Repeat className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Cadence:</span>
                    <span className="font-semibold text-slate-200">{st.defaultCadence}</span>
                  </div>

                  {st.estimatedHours != null && (
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      <span>Estimate:</span>
                      <span className="font-semibold text-slate-200">{st.estimatedHours}h</span>
                    </div>
                  )}
                </div>

                {st._count && (
                  <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-800/60 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Layers className="w-3 h-3 text-purple-400" />
                      {st._count.engagements || 0} Engagements
                    </span>
                    <span className="flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-cyan-400" />
                      {st._count.templates || 0} Templates
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-slate-800/80">
                <Button
                  size="sm"
                  variant="outline"
                  leftIcon={<Edit2 className="w-3.5 h-3.5" />}
                  onClick={() => openEditModal(st)}
                >
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-rose-400 hover:text-rose-300 hover:bg-rose-950/30"
                  leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                  onClick={() => handleDelete(st.id, st.name)}
                >
                  Delete
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? 'Edit Service Type' : 'Add Service Type'}
        description="Configure standard service catalog offering with default cadence and estimation"
        maxWidth="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Service Name"
            placeholder="e.g. Monthly Bookkeeping, Quarterly Tax Review"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5 block">
              Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Scope of work, deliverables, and expectations..."
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5 block">
                Default Cadence
              </label>
              <select
                value={defaultCadence}
                onChange={(e) => setDefaultCadence(e.target.value as RecurrenceFrequency)}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:ring-2 focus:ring-indigo-500/50"
              >
                {CADENCE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <Input
              label="Estimated Hours"
              type="number"
              min="0"
              step="0.5"
              placeholder="e.g. 10"
              value={estimatedHours}
              onChange={(e) => setEstimatedHours(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="isActiveToggle"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 bg-slate-950"
            />
            <label htmlFor="isActiveToggle" className="text-xs font-medium text-slate-300 cursor-pointer">
              Active (Available for new client engagements)
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={submitting}>
              {editingId ? 'Save Changes' : 'Create Service Type'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
