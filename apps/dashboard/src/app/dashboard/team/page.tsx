'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { api } from '../../../lib/api';
import Modal from '../../../components/Modal';
import Badge from '../../../components/Badge';
import LoadingSpinner from '../../../components/LoadingSpinner';
import EmptyState from '../../../components/EmptyState';
import UsageBar from '../../../components/UsageBar';

// ── Types ─────────────────────────────────────────────────────────────────

interface TeamMember {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

interface Quota {
  current: number;
  limit: number;
}

// ── Badge config ──────────────────────────────────────────────────────────

const ROLE_VARIANTS: Record<string, 'blue' | 'yellow' | 'green' | 'gray' | 'orange'> = {
  owner: 'blue',
  admin: 'orange',
  agent: 'yellow',
};

// ── Component ─────────────────────────────────────────────────────────────

export default function TeamPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'owner' || user?.role === 'admin';

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [quota, setQuota] = useState<Quota | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editMember, setEditMember] = useState<TeamMember | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Create form
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'agent',
  });

  // Edit form
  const [editForm, setEditForm] = useState({
    name: '',
    role: 'agent',
  });

  const fetchTeam = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.getTeamMembers();
      // result is unwrapped by api client (json.data), but meta is on the outer json
      // The api client returns json.data which is the members array
      // We need to handle the response structure
      if (Array.isArray(result)) {
        setMembers(result);
      } else {
        setMembers(result.members || result);
        if (result.quota) setQuota(result.quota);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load team');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTeam();
  }, [fetchTeam]);

  // ── Create handler ────────────────────────────────────────────────

  const handleCreate = async () => {
    setSaving(true);
    setFormError(null);
    try {
      await api.createTeamMember(createForm);
      setShowCreateModal(false);
      setCreateForm({ name: '', email: '', password: '', role: 'agent' });
      await fetchTeam();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create member');
    } finally {
      setSaving(false);
    }
  };

  // ── Edit handler ──────────────────────────────────────────────────

  const openEdit = (member: TeamMember) => {
    setEditMember(member);
    setEditForm({ name: member.name, role: member.role });
    setFormError(null);
  };

  const handleEdit = async () => {
    if (!editMember) return;
    setSaving(true);
    setFormError(null);
    try {
      await api.updateTeamMember(editMember.id, editForm);
      setEditMember(null);
      await fetchTeam();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to update member');
    } finally {
      setSaving(false);
    }
  };

  // ── Toggle active handler ─────────────────────────────────────────

  const handleToggleActive = async (member: TeamMember) => {
    try {
      await api.updateTeamMember(member.id, { isActive: !member.isActive });
      await fetchTeam();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update member');
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team</h1>
          <p className="mt-1 text-sm text-gray-500">
            {members.length} member{members.length !== 1 ? 's' : ''}
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => { setShowCreateModal(true); setFormError(null); }}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            + Add Member
          </button>
        )}
      </div>

      {/* Quota bar */}
      {quota && (
        <div className="mb-6 rounded-xl border bg-white p-4 shadow-sm">
          <UsageBar label="Team Members" used={quota.current} limit={quota.limit} unit="members" />
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      ) : error ? (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</div>
      ) : members.length === 0 ? (
        <EmptyState
          icon="👥"
          title="No team members"
          description="Add team members to help manage your WhatsApp support."
        />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm md:block">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Role</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Joined</th>
                  {isAdmin && (
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-gray-500">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {members.map((member) => (
                  <tr key={member.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{member.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{member.email}</td>
                    <td className="px-4 py-3">
                      <Badge variant={ROLE_VARIANTS[member.role] ?? 'gray'} size="sm">
                        {member.role}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={member.isActive ? 'green' : 'gray'} size="sm">
                        {member.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(member.createdAt).toLocaleDateString()}
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3 text-right">
                        {member.role !== 'owner' && (
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={() => openEdit(member)}
                              className="rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleToggleActive(member)}
                              className={`rounded px-2 py-1 text-xs font-medium ${
                                member.isActive
                                  ? 'bg-red-50 text-red-700 hover:bg-red-100'
                                  : 'bg-green-50 text-green-700 hover:bg-green-100'
                              }`}
                            >
                              {member.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {members.map((member) => (
              <div key={member.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-bold text-gray-900">{member.name}</span>
                  <div className="flex gap-1">
                    <Badge variant={ROLE_VARIANTS[member.role] ?? 'gray'} size="sm">
                      {member.role}
                    </Badge>
                    <Badge variant={member.isActive ? 'green' : 'gray'} size="sm">
                      {member.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
                <div className="text-xs text-gray-500">{member.email}</div>
                <div className="mt-1 text-xs text-gray-400">
                  Joined {new Date(member.createdAt).toLocaleDateString()}
                </div>
                {isAdmin && member.role !== 'owner' && (
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => openEdit(member)}
                      className="flex-1 rounded bg-gray-100 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleToggleActive(member)}
                      className={`flex-1 rounded py-1.5 text-xs font-medium ${
                        member.isActive
                          ? 'bg-red-50 text-red-700'
                          : 'bg-green-50 text-green-700'
                      }`}
                    >
                      {member.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Create Modal ───────────────────────────────────────────── */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Add Team Member"
        footer={
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowCreateModal(false)}
              className="rounded-lg border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={saving || !createForm.name || !createForm.email || !createForm.password}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Creating...' : 'Create'}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          {formError && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{formError}</div>
          )}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Name</label>
            <input
              type="text"
              value={createForm.name}
              onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              placeholder="Full name"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              value={createForm.email}
              onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
              placeholder="agent@example.com"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Password</label>
            <input
              type="password"
              value={createForm.password}
              onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
              placeholder="Min 8 characters"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Role</label>
            <select
              value={createForm.role}
              onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
            >
              <option value="agent">Agent</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>
      </Modal>

      {/* ── Edit Modal ─────────────────────────────────────────────── */}
      <Modal
        isOpen={!!editMember}
        onClose={() => setEditMember(null)}
        title={`Edit ${editMember?.name ?? 'Member'}`}
        footer={
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setEditMember(null)}
              className="rounded-lg border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleEdit}
              disabled={saving || !editForm.name}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          {formError && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{formError}</div>
          )}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Name</label>
            <input
              type="text"
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              value={editMember?.email ?? ''}
              disabled
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Role</label>
            <select
              value={editForm.role}
              onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
            >
              <option value="agent">Agent</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>
      </Modal>
    </div>
  );
}
