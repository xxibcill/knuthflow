// ─────────────────────────────────────────────────────────────────────────────
// IterationBacklogPanel - Iteration Backlog Management (Phase 26)
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useCallback, useEffect } from 'react';

export interface BacklogItem {
  id: string;
  title: string;
  description: string;
  source: string;
  priority: string;
  status: string;
  createdAt: number;
  updatedAt: number;
  startedAt: number | null;
  completedAt: number | null;
  linkedFeedbackId: string | null;
}

export interface IterationBacklogPanelProps {
  className?: string;
}

const PRIORITY_STYLES: Record<string, string> = {
  high: 'badge badge-error',
  medium: 'badge badge-warning',
  low: 'badge badge-neutral',
};

const STATUS_STYLES: Record<string, string> = {
  pending: 'badge badge-neutral',
  in_progress: 'badge badge-info',
  completed: 'badge badge-success',
  cancelled: 'badge badge-warning',
};

export function IterationBacklogPanel({ className = '' }: IterationBacklogPanelProps) {
  const [items, setItems] = useState<BacklogItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');

  // Create form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newSource, setNewSource] = useState('operator');
  const [newPriority, setNewPriority] = useState('medium');
  const [submitting, setSubmitting] = useState(false);

  const loadItems = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await window.ralph.iterationBacklog.list({ limit: 50 }) as { error?: string } | Array<BacklogItem>;
      if ('error' in result) {
        setError(result.error || 'Failed to load backlog items');
        setItems([]);
      } else {
        setItems(Array.isArray(result) ? result : []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load backlog items');
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const handleCreate = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setSubmitting(true);
    setError(null);
    try {
      const result = await window.ralph.iterationBacklog.create({
        title: newTitle.trim(),
        description: newDescription.trim(),
        source: newSource,
        priority: newPriority as 'high' | 'medium' | 'low',
      }) as { error?: string } | BacklogItem;

      if ('error' in result) {
        setError(result.error || 'Failed to create backlog item');
      } else {
        setNewTitle('');
        setNewDescription('');
        setNewSource('operator');
        setNewPriority('medium');
        setShowCreateForm(false);
        await loadItems();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create backlog item');
    } finally {
      setSubmitting(false);
    }
  }, [newTitle, newDescription, newSource, newPriority, loadItems]);

  const handleUpdateStatus = useCallback(async (item: BacklogItem, newStatus: string) => {
    try {
      const result = await window.ralph.iterationBacklog.update(item.id, { status: newStatus }) as { error?: string };
      if (result?.error) {
        setError(result.error);
      } else {
        await loadItems();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    }
  }, [loadItems]);

  const handleUpdatePriority = useCallback(async (item: BacklogItem, newPriority: string) => {
    try {
      const result = await window.ralph.iterationBacklog.update(item.id, { priority: newPriority }) as { error?: string };
      if (result?.error) {
        setError(result.error);
      } else {
        await loadItems();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update priority');
    }
  }, [loadItems]);

  const filteredItems = items.filter((item) => {
    if (filterStatus !== 'all' && item.status !== filterStatus) return false;
    if (filterPriority !== 'all' && item.priority !== filterPriority) return false;
    return true;
  });

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className={`section-shell ${className}`}>
      <div className="section-header">
        <div>
          <h2 className="section-title">Iteration Backlog</h2>
          <p className="section-lead">Track and prioritize items for Ralph iteration improvements.</p>
        </div>
        <div className="toolbar-inline">
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="btn btn-sm"
          >
            {showCreateForm ? 'Cancel' : '+ Add Item'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 border border-red-500 rounded">
          <p className="text-red-300">{error}</p>
        </div>
      )}

      {/* Create Form */}
      {showCreateForm && (
        <div className="surface-panel p-4 mb-6">
          <h3 className="text-sm font-semibold mb-3">Add Backlog Item</h3>
          <form onSubmit={handleCreate}>
            <div className="mb-3">
              <label className="block text-xs text-muted mb-1">Title</label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="What needs to be done?"
                className="input input-sm w-full"
                required
              />
            </div>

            <div className="mb-3">
              <label className="block text-xs text-muted mb-1">Description</label>
              <textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                rows={2}
                className="input input-sm w-full"
                placeholder="Add details..."
              />
            </div>

            <div className="grid grid-cols-3 gap-3 mb-3">
              <div>
                <label className="block text-xs text-muted mb-1">Source</label>
                <select
                  value={newSource}
                  onChange={(e) => setNewSource(e.target.value)}
                  className="input input-sm w-full"
                >
                  <option value="operator">Operator</option>
                  <option value="feedback">Feedback</option>
                  <option value="monitoring">Monitoring</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-muted mb-1">Priority</label>
                <select
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value)}
                  className="input input-sm w-full"
                >
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
              <div className="flex items-end">
                <button type="submit" disabled={submitting} className="btn btn-sm w-full">
                  {submitting ? 'Creating...' : 'Create'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-4 mb-4">
        <div>
          <label className="block text-xs text-muted mb-1">Status</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="input input-sm"
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-muted mb-1">Priority</label>
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="input input-sm"
          >
            <option value="all">All</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
        <button onClick={loadItems} disabled={isLoading} className="btn btn-ghost btn-sm self-end">
          Refresh
        </button>
      </div>

      {/* Items List */}
      {isLoading && items.length === 0 ? (
        <div className="text-center p-8 text-muted">Loading backlog items...</div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center p-8 text-muted">
          {items.length === 0
            ? 'No backlog items yet. Add items to track iteration work.'
            : 'No items match the current filters.'}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredItems.map((item) => (
            <div key={item.id} className="surface-panel p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium">{item.title}</h3>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={item.priority}
                    onChange={(e) => handleUpdatePriority(item, e.target.value)}
                    className="input input-xs"
                  >
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                  <span className={PRIORITY_STYLES[item.priority]}>{item.priority}</span>
                </div>
              </div>

              {item.description && (
                <p className="text-sm text-muted mb-3">{item.description}</p>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={STATUS_STYLES[item.status]}>{item.status.replace('_', ' ')}</span>
                  <span className="text-xs text-muted">Source: {item.source}</span>
                  {item.linkedFeedbackId && (
                    <span className="text-xs text-muted">Linked to feedback</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {item.status !== 'completed' && item.status !== 'cancelled' && (
                    <>
                      {item.status === 'pending' && (
                        <button
                          onClick={() => handleUpdateStatus(item, 'in_progress')}
                          className="btn btn-ghost btn-xs"
                        >
                          Start
                        </button>
                      )}
                      {item.status === 'in_progress' && (
                        <button
                          onClick={() => handleUpdateStatus(item, 'completed')}
                          className="btn btn-ghost btn-xs"
                        >
                          Complete
                        </button>
                      )}
                    </>
                  )}
                  {item.status === 'pending' && (
                    <button
                      onClick={() => handleUpdateStatus(item, 'cancelled')}
                      className="btn btn-ghost btn-xs text-muted"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-2 text-xs text-muted">
                Created: {formatDate(item.createdAt)}
                {item.startedAt && ` · Started: ${formatDate(item.startedAt)}`}
                {item.completedAt && ` · Completed: ${formatDate(item.completedAt)}`}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default IterationBacklogPanel;