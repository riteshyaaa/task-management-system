import React, { useEffect, useState } from 'react';
import { Users, UserPlus, Trash2, Crown } from 'lucide-react';
import { useClient } from '../context/ClientContext';
import { useToast } from '../context/ToastContext';
import { clientService } from '../services/client.service';
import { clientMember, ClientRole } from '../types/client.types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { formatDate } from '../utils/formatters';

export const ClientPage: React.FC = () => {
  const { currentClient } = useClient();
  const { showToast } = useToast();
  const [members, setMembers] = useState<clientMember[]>([]);
  const [loading, setLoading] = useState(true);

  // Invite Member Modal
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState<ClientRole>('MEMBER');
  const [submitting, setSubmitting] = useState(false);

  const loadMembers = async () => {
    if (!currentClient) return;
    try {
      setLoading(true);
      const data = await clientService.getclientMembers(currentClient.id);
      setMembers(data);
    } catch (err) {
      console.error('Failed to load client members:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMembers();
  }, [currentClient?.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentClient || !userEmail.trim()) return;

    try {
      setSubmitting(true);
      await clientService.addclientMember(currentClient.id, {
        email: userEmail,
        role: selectedRole,
      });

      showToast(`Member invited as ${selectedRole}`, 'success');
      setIsInviteOpen(false);
      setUserEmail('');
      loadMembers();
    } catch (err: any) {
      showToast(err.response?.data?.error?.message || 'Failed to add member to workspace', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!currentClient) return;
    try {
      await clientService.removeclientMember(currentClient.id, memberId);
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
      showToast('Member removed from client', 'success');
    } catch (err: any) {
      showToast(err.response?.data?.error?.message || 'Failed to remove member', 'error');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            client Workspace & Access Control <Users className="w-5 h-5 text-indigo-400" />
          </h1>
          <p className="text-xs text-slate-400">
            Manage multi-tenant workspace members, granular RBAC assignments, and client settings
          </p>
        </div>

        <Button variant="primary" leftIcon={<UserPlus className="w-4 h-4" />} onClick={() => setIsInviteOpen(true)}>
          Invite Member
        </Button>
      </div>

      {/* Workspace Profile Card */}
      {currentClient && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 font-bold text-lg">
              {(currentClient.name || 'T').charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">{currentClient.name}</h2>
                <Badge variant="primary" size="sm">
                  {currentClient.slug}
                </Badge>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {currentClient.description || 'Enterprise workspace tenancy'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="text-center px-4 py-2 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Total Members</span>
              <span className="text-base font-bold text-white">{members.length}</span>
            </div>
            <div className="text-center px-4 py-2 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Created</span>
              <span className="text-base font-bold text-slate-300">{formatDate(currentClient.createdAt)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Members Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <th className="py-3 px-4">Member</th>
                <th className="py-3 px-4">Role & Permissions</th>
                <th className="py-3 px-4">Joined Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {members.map((member) => (
                <tr key={member.id} className="hover:bg-slate-900/40 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-indigo-400">
                        {(member.user?.firstName || 'U').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-white">
                          {member.user?.firstName || 'User'} {member.user?.lastName || ''}
                        </p>
                        <p className="text-[10px] text-slate-400">{member.user?.email || ''}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <Badge
                      variant={
                        member.role === 'ADMIN'
                          ? 'warning'
                          : member.role === 'MANAGER'
                          ? 'purple'
                          : 'default'
                      }
                      size="sm"
                    >
                      {member.role === 'ADMIN' && <Crown className="w-3 h-3 mr-1 inline" />}
                      {member.role}
                    </Badge>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-400">{formatDate(member.joinedAt)}</td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => handleRemoveMember(member.id)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      title="Remove Member"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Invite Member Modal */}
      <Modal
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        title="Invite Member to Workspace"
        description="Grant access and designate workspace role permissions"
      >
        <form onSubmit={handleAddMember} className="space-y-4">
          <Input
            label="User Email"
            placeholder="colleague@enterprise.com"
            type="email"
            value={userEmail}
            onChange={(e) => setUserEmail(e.target.value)}
            required
          />

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5 block">
              Workspace Role
            </label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as ClientRole)}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-slate-100"
            >
              <option value="MEMBER">MEMBER (Read, Write Tasks & Subtasks)</option>
              <option value="MANAGER">MANAGER (Sprint Manager, Workflows & Templates)</option>
              <option value="ADMIN">ADMIN (Full Workspace Control, Settings & Access)</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsInviteOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={submitting}>
              Send Invitation
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
