import React, { useEffect, useState } from 'react';
import { History, Filter, Eye, ShieldCheck, RefreshCw } from 'lucide-react';
import { useClient } from '../context/ClientContext';
import { auditService } from '../services/audit.service';
import { AuditLog, AuditAction } from '../types/audit.types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { formatDate } from '../utils/formatters';

export const AuditLogPage: React.FC = () => {
  const { currentClient } = useClient();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEntity, setSelectedEntity] = useState('');
  const [selectedAction, setSelectedAction] = useState<string>('');
  const [inspectLog, setInspectLog] = useState<AuditLog | null>(null);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const data = await auditService.getAuditLogs({
        clientId: currentClient?.id,
        entityType: selectedEntity || undefined,
        action: (selectedAction as AuditAction) || undefined,
      });
      setLogs(data.logs || []);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [currentClient?.id, selectedEntity, selectedAction]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            Append-Only Audit Trail <History className="w-5 h-5 text-indigo-400" />
          </h1>
          <p className="text-xs text-slate-400">
            Immutable governance ledger with cryptographically verifiable diff tracking and IP audit records
          </p>
        </div>

        <Button variant="outline" leftIcon={<RefreshCw className="w-4 h-4" />} onClick={loadLogs}>
          Refresh Ledger
        </Button>
      </div>

      {/* Filter Bar */}
      <Card className="flex flex-wrap items-center gap-4 py-3.5">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
          <Filter className="w-4 h-4 text-indigo-400" /> Filter Log:
        </div>

        <select
          value={selectedEntity}
          onChange={(e) => setSelectedEntity(e.target.value)}
          className="bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-slate-200"
        >
          <option value="">All Entities</option>
          <option value="Task">Task Entity</option>
          <option value="WorkflowDefinition">Workflow Engine</option>
          <option value="RecurrenceRule">Recurrence Schedule</option>
          <option value="client">client Workspace</option>
          <option value="User">User Profile</option>
        </select>

        <select
          value={selectedAction}
          onChange={(e) => setSelectedAction(e.target.value)}
          className="bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-slate-200"
        >
          <option value="">All Operations</option>
          <option value="CREATE">CREATE</option>
          <option value="UPDATE">UPDATE</option>
          <option value="DELETE">DELETE</option>
          <option value="BULK_UPDATE">BULK UPDATE</option>
          <option value="STATE_TRANSITION">STATE TRANSITION</option>
        </select>

        <div className="ml-auto flex items-center gap-2">
          <Badge variant="success" size="sm">
            <ShieldCheck className="w-3 h-3 mr-1" /> Retention Active (365d)
          </Badge>
        </div>
      </Card>

      {/* Audit Logs Table */}
      <Card>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Entity</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Changed Fields</th>
                  <th className="py-3 px-4 text-right">Inspect Diff</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-slate-400">
                      No immutable log records found matching the filter criteria.
                    </td>
                  </tr>
                ) : (
                  logs.map((entry) => (
                    <tr key={entry.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-slate-300">
                        {formatDate(entry.timestamp)}
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge
                          variant={
                            entry.action === 'CREATE'
                              ? 'success'
                              : entry.action === 'DELETE'
                              ? 'danger'
                              : 'primary'
                          }
                          size="sm"
                        >
                          {entry.action}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-white">{entry.entityType}</span>
                        <span className="text-[10px] font-mono text-slate-500 block truncate max-w-[120px]">
                          {entry.entityId}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {entry.performedBy ? (
                          <div>
                            <p className="font-semibold text-slate-200">
                              {entry.performedBy.firstName} {entry.performedBy.lastName}
                            </p>
                            <p className="text-[10px] text-slate-500">{entry.ipAddress || '127.0.0.1'}</p>
                          </div>
                        ) : (
                          <span className="text-slate-500 italic">SYSTEM SCHEDULER</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {entry.changedFields && entry.changedFields.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {entry.changedFields.map((f: string) => (
                              <span
                                key={f}
                                className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-indigo-300 border border-slate-700"
                              >
                                {f}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-500 text-[10px]">Initial snapshot</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          leftIcon={<Eye className="w-3.5 h-3.5 text-indigo-400" />}
                          onClick={() => setInspectLog(entry)}
                        >
                          Diff View
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* JSON Diff Inspector Modal */}
      {inspectLog && (
        <Modal
          isOpen={Boolean(inspectLog)}
          onClose={() => setInspectLog(null)}
          title={`Audit Record: ${inspectLog.entityType} (${inspectLog.action})`}
          description={`Logged at ${formatDate(inspectLog.timestamp)} by ${
            inspectLog.performedBy?.email || 'System'
          }`}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-950 p-3 rounded-xl border border-slate-800">
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">IP Address</span>
                <span className="font-mono text-slate-200">{inspectLog.ipAddress || '127.0.0.1'}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">User Agent</span>
                <span className="font-mono text-slate-200 truncate block">
                  {inspectLog.userAgent || 'Mozilla/5.0'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-rose-400 mb-1.5 flex items-center gap-1">
                  Old State (Pre-Execution)
                </p>
                <pre className="text-[11px] font-mono bg-rose-950/20 text-rose-300 border border-rose-900/40 p-3.5 rounded-xl overflow-x-auto max-h-60">
                  {JSON.stringify(inspectLog.oldValues, null, 2) || '{}'}
                </pre>
              </div>

              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 mb-1.5 flex items-center gap-1">
                  New State (Post-Execution)
                </p>
                <pre className="text-[11px] font-mono bg-emerald-950/20 text-emerald-300 border border-emerald-900/40 p-3.5 rounded-xl overflow-x-auto max-h-60">
                  {JSON.stringify(inspectLog.newValues, null, 2) || '{}'}
                </pre>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-800">
              <Button variant="primary" onClick={() => setInspectLog(null)}>
                Done Inspecting
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
