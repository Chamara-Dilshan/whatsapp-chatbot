'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { api } from '../../../lib/api';
import Modal from '../../../components/Modal';
import Badge from '../../../components/Badge';
import EmptyState from '../../../components/EmptyState';
import LoadingSpinner from '../../../components/LoadingSpinner';

interface Case {
  id: string;
  subject: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  tags: string[];
  notes?: string;
  resolution?: string;
  conversationId: string;
  assignedTo?: string;
  assignedToUser?: { id: string; name: string; email: string };
  createdAt: string;
  updatedAt: string;
  firstResponseAt?: string;
  resolvedAt?: string;
  slaDeadline?: string;
}

export default function CasesPage() {
  const { user } = useAuth();
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [assignedToFilter, setAssignedToFilter] = useState<string>('');
  const [myCasesOnly, setMyCasesOnly] = useState(false);

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    open: 0,
    inProgress: 0,
    resolved: 0,
    slaBreached: 0,
  });

  // Modals
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    subject: '',
    status: 'open' as Case['status'],
    priority: 'medium' as Case['priority'],
    tags: '',
    notes: '',
    resolution: '',
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    loadCases();
  }, [statusFilter, priorityFilter, assignedToFilter, myCasesOnly]);

  const loadCases = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = {};
      if (statusFilter) params.status = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;
      if (myCasesOnly && user) params.assignedTo = user.id;
      else if (assignedToFilter) params.assignedTo = assignedToFilter;

      const data = await api.getCases(params);
      const casesList = data.cases || data;
      setCases(casesList);

      // Calculate stats
      const total = casesList.length;
      const open = casesList.filter((c: Case) => c.status === 'open').length;
      const inProgress = casesList.filter((c: Case) => c.status === 'in_progress').length;
      const resolved = casesList.filter((c: Case) => c.status === 'resolved' || c.status === 'closed').length;
      const slaBreached = casesList.filter((c: Case) => {
        if (!c.slaDeadline) return false;
        return new Date(c.slaDeadline) < new Date() && c.status !== 'resolved' && c.status !== 'closed';
      }).length;

      setStats({ total, open, inProgress, resolved, slaBreached });
    } catch (err: any) {
      setError(err.message || 'Failed to load cases');
    } finally {
      setLoading(false);
    }
  };

  const openDetailModal = async (caseItem: Case) => {
    try {
      const fullCase = await api.getCase(caseItem.id);
      setSelectedCase(fullCase);
      setFormData({
        subject: fullCase.subject,
        status: fullCase.status,
        priority: fullCase.priority,
        tags: fullCase.tags?.join(', ') || '',
        notes: fullCase.notes || '',
        resolution: fullCase.resolution || '',
      });
      setIsEditMode(false);
      setShowDetailModal(true);
    } catch (err: any) {
      alert(`Failed to load case: ${err.message}`);
    }
  };

  const handleUpdateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCase) return;

    setFormLoading(true);
    setFormError(null);

    try {
      const updateData: any = {
        subject: formData.subject,
        status: formData.status,
        priority: formData.priority,
        tags: formData.tags ? formData.tags.split(',').map(t => t.trim()) : [],
        notes: formData.notes || undefined,
      };

      if (formData.status === 'resolved' || formData.status === 'closed') {
        updateData.resolution = formData.resolution;
      }

      await api.updateCase(selectedCase.id, updateData);
      setShowDetailModal(false);
      setSelectedCase(null);
      setIsEditMode(false);
      loadCases();
    } catch (err: any) {
      setFormError(err.message || 'Failed to update case');
    } finally {
      setFormLoading(false);
    }
  };

  const handleAssignToMe = async (caseItem: Case) => {
    if (!user) return;

    try {
      await api.updateCase(caseItem.id, { assignedTo: user.id });
      loadCases();
      if (selectedCase && selectedCase.id === caseItem.id) {
        const updated = await api.getCase(caseItem.id);
        setSelectedCase(updated);
      }
    } catch (err: any) {
      alert(`Failed to assign case: ${err.message}`);
    }
  };

  const handleCloseCase = async (caseItem: Case) => {
    const resolution = prompt('Enter resolution notes:');
    if (resolution === null) return;

    try {
      await api.updateCase(caseItem.id, { status: 'closed', resolution });
      loadCases();
      if (selectedCase && selectedCase.id === caseItem.id) {
        setShowDetailModal(false);
        setSelectedCase(null);
      }
    } catch (err: any) {
      alert(`Failed to close case: ${err.message}`);
    }
  };

  const clearFilters = () => {
    setStatusFilter('');
    setPriorityFilter('');
    setAssignedToFilter('');
    setMyCasesOnly(false);
  };

  const getStatusBadgeVariant = (status: Case['status']) => {
    switch (status) {
      case 'open': return 'blue';
      case 'in_progress': return 'yellow';
      case 'resolved': return 'green';
      case 'closed': return 'gray';
    }
  };

  const getPriorityBadgeVariant = (priority: Case['priority']) => {
    switch (priority) {
      case 'low': return 'gray';
      case 'medium': return 'blue';
      case 'high': return 'orange';
      case 'urgent': return 'red';
    }
  };

  const getSLAStatus = (caseItem: Case) => {
    if (!caseItem.slaDeadline) return { text: 'N/A', variant: 'gray' as const };
    if (caseItem.status === 'resolved' || caseItem.status === 'closed') {
      return { text: 'Resolved', variant: 'green' as const };
    }

    const deadline = new Date(caseItem.slaDeadline);
    const now = new Date();
    const diffMs = deadline.getTime() - now.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffMs < 0) {
      return { text: 'Breached', variant: 'red' as const };
    } else if (diffHours < 2) {
      const diffMins = Math.floor((diffMs / (1000 * 60)));
      return { text: `${diffMins}m left`, variant: 'yellow' as const };
    } else {
      return { text: 'On Track', variant: 'green' as const };
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (loading && cases.length === 0) {
    return <LoadingSpinner message="Loading cases..." />;
  }

  if (error && cases.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="mb-4 text-red-600">{error}</p>
          <button
            onClick={loadCases}
            className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-4 md:mb-6">
        <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">Cases</h1>
        <p className="mt-1 text-sm text-gray-800 md:text-base">
          Manage support cases and track SLA
        </p>
      </div>

      {/* Stats */}
      <div className="mb-4 grid grid-cols-2 gap-3 md:mb-6 md:grid-cols-5">
        <div className="rounded-lg bg-white p-3 shadow md:p-4">
          <div className="text-xs text-gray-900 md:text-sm">Total Cases</div>
          <div className="mt-1 text-2xl font-bold text-gray-900 md:text-3xl">{stats.total}</div>
        </div>
        <div className="rounded-lg bg-white p-3 shadow md:p-4">
          <div className="text-xs text-gray-900 md:text-sm">Open</div>
          <div className="mt-1 text-2xl font-bold text-blue-600 md:text-3xl">{stats.open}</div>
        </div>
        <div className="rounded-lg bg-white p-3 shadow md:p-4">
          <div className="text-xs text-gray-900 md:text-sm">In Progress</div>
          <div className="mt-1 text-2xl font-bold text-yellow-600 md:text-3xl">{stats.inProgress}</div>
        </div>
        <div className="rounded-lg bg-white p-3 shadow md:p-4">
          <div className="text-xs text-gray-900 md:text-sm">Resolved</div>
          <div className="mt-1 text-2xl font-bold text-green-600 md:text-3xl">{stats.resolved}</div>
        </div>
        <div className="rounded-lg bg-white p-3 shadow md:p-4">
          <div className="text-xs text-gray-900 md:text-sm">SLA Breached</div>
          <div className="mt-1 text-2xl font-bold text-red-600 md:text-3xl">{stats.slaBreached}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-col gap-2 md:mb-6 md:flex-row md:items-center md:gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none md:text-base"
        >
          <option value="">All Status</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>

        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none md:text-base"
        >
          <option value="">All Priorities</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </select>

        <label className="flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 md:text-base">
          <input
            type="checkbox"
            checked={myCasesOnly}
            onChange={(e) => setMyCasesOnly(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          My Cases Only
        </label>

        {(statusFilter || priorityFilter || assignedToFilter || myCasesOnly) && (
          <button
            onClick={clearFilters}
            className="rounded-md bg-gray-200 px-3 py-2 text-sm text-gray-900 hover:bg-gray-300 md:text-base"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Cases List */}
      {cases.length === 0 ? (
        <EmptyState
          icon="📋"
          title="No cases found"
          description={statusFilter || priorityFilter || assignedToFilter || myCasesOnly
            ? "Try adjusting your filters"
            : "Cases are created when customers request agent support"}
        />
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden overflow-hidden rounded-lg bg-white shadow md:block">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Subject
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Priority
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Assigned To
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    SLA
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Created
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {cases.map((caseItem) => {
                  const slaStatus = getSLAStatus(caseItem);
                  return (
                    <tr
                      key={caseItem.id}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => openDetailModal(caseItem)}
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">
                          {caseItem.subject.length > 60
                            ? `${caseItem.subject.substring(0, 60)}...`
                            : caseItem.subject}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={getStatusBadgeVariant(caseItem.status)}>
                          {caseItem.status.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={getPriorityBadgeVariant(caseItem.priority)}>
                          {caseItem.priority}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {caseItem.assignedToUser?.name || 'Unassigned'}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={slaStatus.variant}>
                          {slaStatus.text}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {formatDate(caseItem.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        {(!caseItem.assignedTo || caseItem.assignedTo !== user?.id) && (
                          <button
                            onClick={() => handleAssignToMe(caseItem)}
                            className="mr-2 text-blue-600 hover:text-blue-800"
                            title="Assign to me"
                          >
                            👤
                          </button>
                        )}
                        {caseItem.status !== 'closed' && (
                          <button
                            onClick={() => handleCloseCase(caseItem)}
                            className="text-green-600 hover:text-green-800"
                            title="Close case"
                          >
                            ✓
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="grid gap-3 md:hidden">
            {cases.map((caseItem) => {
              const slaStatus = getSLAStatus(caseItem);
              return (
                <div
                  key={caseItem.id}
                  className="rounded-lg bg-white p-4 shadow"
                  onClick={() => openDetailModal(caseItem)}
                >
                  <div className="mb-3">
                    <div className="font-medium text-gray-900">{caseItem.subject}</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge variant={getStatusBadgeVariant(caseItem.status)} size="sm">
                        {caseItem.status.replace('_', ' ')}
                      </Badge>
                      <Badge variant={getPriorityBadgeVariant(caseItem.priority)} size="sm">
                        {caseItem.priority}
                      </Badge>
                      <Badge variant={slaStatus.variant} size="sm">
                        {slaStatus.text}
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-800">Assigned To:</span>
                      <span className="font-medium">{caseItem.assignedToUser?.name || 'Unassigned'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-800">Created:</span>
                      <span className="font-medium">{formatDate(caseItem.createdAt)}</span>
                    </div>
                  </div>

                  <div className="mt-3 flex gap-2 border-t pt-3" onClick={(e) => e.stopPropagation()}>
                    {(!caseItem.assignedTo || caseItem.assignedTo !== user?.id) && (
                      <button
                        onClick={() => handleAssignToMe(caseItem)}
                        className="flex-1 rounded-md bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700"
                      >
                        Assign to Me
                      </button>
                    )}
                    {caseItem.status !== 'closed' && (
                      <button
                        onClick={() => handleCloseCase(caseItem)}
                        className="flex-1 rounded-md bg-green-600 px-3 py-2 text-sm text-white hover:bg-green-700"
                      >
                        Close
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Case Detail Modal */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedCase(null);
          setIsEditMode(false);
        }}
        title={isEditMode ? 'Edit Case' : 'Case Details'}
        size="lg"
      >
        {selectedCase && (
          <div className="space-y-4">
            {formError && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
                {formError}
              </div>
            )}

            {!isEditMode ? (
              /* View Mode */
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-900">Subject</label>
                  <div className="mt-1 text-sm text-gray-900">{selectedCase.subject}</div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-900">Status</label>
                    <div className="mt-1">
                      <Badge variant={getStatusBadgeVariant(selectedCase.status)}>
                        {selectedCase.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-900">Priority</label>
                    <div className="mt-1">
                      <Badge variant={getPriorityBadgeVariant(selectedCase.priority)}>
                        {selectedCase.priority}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-900">Assigned To</label>
                  <div className="mt-1 text-sm text-gray-900">
                    {selectedCase.assignedToUser?.name || 'Unassigned'}
                  </div>
                </div>

                {selectedCase.tags && selectedCase.tags.length > 0 && (
                  <div>
                    <label className="text-xs font-medium text-gray-900">Tags</label>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {selectedCase.tags.map((tag, idx) => (
                        <Badge key={idx} variant="gray" size="sm">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {selectedCase.notes && (
                  <div>
                    <label className="text-xs font-medium text-gray-900">Notes</label>
                    <div className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{selectedCase.notes}</div>
                  </div>
                )}

                {selectedCase.resolution && (
                  <div>
                    <label className="text-xs font-medium text-gray-900">Resolution</label>
                    <div className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{selectedCase.resolution}</div>
                  </div>
                )}

                <div className="border-t pt-3">
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-gray-800">Created:</span>{' '}
                      <span className="text-gray-900">{formatDate(selectedCase.createdAt)}</span>
                    </div>
                    {selectedCase.firstResponseAt && (
                      <div>
                        <span className="text-gray-800">First Response:</span>{' '}
                        <span className="text-gray-900">{formatDate(selectedCase.firstResponseAt)}</span>
                      </div>
                    )}
                    {selectedCase.resolvedAt && (
                      <div>
                        <span className="text-gray-800">Resolved:</span>{' '}
                        <span className="text-gray-900">{formatDate(selectedCase.resolvedAt)}</span>
                      </div>
                    )}
                    {selectedCase.slaDeadline && (
                      <div>
                        <span className="text-gray-800">SLA Deadline:</span>{' '}
                        <span className="text-gray-900">{new Date(selectedCase.slaDeadline).toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-2 border-t pt-3">
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="rounded-md bg-gray-200 px-4 py-2 text-sm text-gray-900 hover:bg-gray-300"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => setIsEditMode(true)}
                    className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
                  >
                    Edit
                  </button>
                </div>
              </div>
            ) : (
              /* Edit Mode */
              <form onSubmit={handleUpdateCase} className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-900">
                    Subject <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-900">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as Case['status'] })}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    >
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-900">Priority</label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value as Case['priority'] })}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-900">
                    Tags (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    placeholder="refund, shipping, complaint"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-900">Notes</label>
                  <textarea
                    rows={4}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>

                {(formData.status === 'resolved' || formData.status === 'closed') && (
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-900">
                      Resolution {formData.status === 'closed' && <span className="text-red-500">*</span>}
                    </label>
                    <textarea
                      rows={3}
                      required={formData.status === 'closed'}
                      value={formData.resolution}
                      onChange={(e) => setFormData({ ...formData, resolution: e.target.value })}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                )}

                <div className="flex justify-end gap-2 border-t pt-3">
                  <button
                    type="button"
                    onClick={() => setIsEditMode(false)}
                    className="rounded-md bg-gray-200 px-4 py-2 text-sm text-gray-900 hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={formLoading}
                    className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {formLoading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
