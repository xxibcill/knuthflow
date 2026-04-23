// ─────────────────────────────────────────────────────────────────────────────
// DeliveredAppsPanel - Registry of Delivered Applications (Phase 26)
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useCallback, useEffect, Component, ReactNode } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// Error Boundary
// ─────────────────────────────────────────────────────────────────────────────

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class DeliveredAppsErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 border border-red-200 rounded-lg bg-red-50">
          <h3 className="text-red-700 font-medium">Delivered Apps Error</h3>
          <p className="text-red-600 text-sm mt-1">{this.state.error?.message}</p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-3 px-3 py-1.5 text-sm border border-red-300 rounded hover:bg-red-100"
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export interface DeliveredApp {
  id: string;
  appId: string;
  workspacePath: string;
  deliveryFormat: string;
  healthStatus: string;
  bundlePath: string | null;
  runId: string | null;
  metadata: Record<string, unknown>;
  deliveredAt: number;
  lastSeenAt: number | null;
  followUpSignal: string | null;
  followUpNotes: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface DeliveredAppsPanelProps {
  className?: string;
}

export function DeliveredAppsPanel({ className = '' }: DeliveredAppsPanelProps) {
  const [apps, setApps] = useState<DeliveredApp[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedApp, setSelectedApp] = useState<DeliveredApp | null>(null);

  // Follow-up form state
  const [followUpSignal, setFollowUpSignal] = useState('');
  const [followUpNotes, setFollowUpNotes] = useState('');

  const loadApps = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await window.ralph.deliveredApps.list(50) as { error?: string } | Array<DeliveredApp>;
      if ('error' in result) {
        setError(result.error || 'Failed to load delivered apps');
        setApps([]);
      } else {
        setApps(Array.isArray(result) ? result : []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load delivered apps');
      setApps([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadApps();
  }, [loadApps]);

  const handleUpdateFollowUp = useCallback(async () => {
    if (!selectedApp) return;

    try {
      const result = await window.ralph.deliveredApps.updateFollowUp(
        selectedApp.id,
        followUpSignal,
        followUpNotes,
      ) as { success?: boolean; error?: string };
      if (result?.error) {
        setError(result.error);
      } else {
        await loadApps();
        setSelectedApp(null);
        setFollowUpSignal('');
        setFollowUpNotes('');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update follow-up');
    }
  }, [selectedApp, followUpSignal, followUpNotes, loadApps]);

  const handleRefreshHealth = useCallback(async (app: DeliveredApp) => {
    try {
      await window.ralph.deliveredApps.updateLastSeen(app.id) as { error?: string };
      await loadApps();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh health status');
    }
  }, [loadApps]);

  const getHealthBadge = (status: string) => {
    const styles: Record<string, string> = {
      healthy: 'badge badge-success',
      degraded: 'badge badge-warning',
      critical: 'badge badge-error',
      unknown: 'badge badge-neutral',
    };
    return styles[status.toLowerCase()] || 'badge badge-neutral';
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className={`section-shell ${className}`}>
      <div className="section-header">
        <div>
          <h2 className="section-title">Delivered Apps Registry</h2>
          <p className="section-lead">Track and monitor applications delivered through Ralph.</p>
        </div>
        <div className="toolbar-inline">
          <button onClick={loadApps} disabled={isLoading} className="btn btn-ghost btn-sm">
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 border border-red-500 rounded">
          <p className="text-red-300">{error}</p>
        </div>
      )}

      {isLoading && apps.length === 0 ? (
        <div className="text-center p-8 text-muted">Loading delivered apps...</div>
      ) : apps.length === 0 ? (
        <div className="text-center p-8 text-muted">
          No delivered apps yet. Apps are registered here after successful delivery handoffs.
        </div>
      ) : (
        <div className="grid gap-4">
          {apps.map((app) => (
            <div key={app.id} className="surface-panel p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold">{app.appId}</h3>
                    <span className={getHealthBadge(app.healthStatus)}>{app.healthStatus}</span>
                    <span className="badge badge-neutral">{app.deliveryFormat}</span>
                  </div>
                  <p className="text-sm text-muted font-mono">{app.workspacePath}</p>
                </div>
                <button
                  onClick={() => handleRefreshHealth(app)}
                  className="btn btn-ghost btn-sm"
                  title="Refresh last-seen timestamp"
                >
                  Ping
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                <div>
                  <span className="text-muted">Delivered:</span>{' '}
                  <span>{formatDate(app.deliveredAt)}</span>
                </div>
                <div>
                  <span className="text-muted">Last Seen:</span>{' '}
                  <span>{app.lastSeenAt ? formatDate(app.lastSeenAt) : 'Never'}</span>
                </div>
              </div>

              {app.followUpSignal && (
                <div className="mt-3 p-3 bg-surface-2 rounded border-l-2 border-yellow-500">
                  <div className="flex items-center justify-between">
                    <span className="badge badge-warning">{app.followUpSignal}</span>
                    {app.followUpNotes && (
                      <p className="text-sm mt-1">{app.followUpNotes}</p>
                    )}
                  </div>
                </div>
              )}

              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => {
                    setSelectedApp(app);
                    setFollowUpSignal(app.followUpSignal || '');
                    setFollowUpNotes(app.followUpNotes || '');
                  }}
                  className="btn btn-ghost btn-sm"
                >
                  Update Follow-up
                </button>
                {app.bundlePath && (
                  <span className="text-xs text-muted self-center">
                    Bundle: {app.bundlePath}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Follow-up Modal */}
      {selectedApp && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="surface-panel p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Update Follow-up: {selectedApp.appId}</h3>

            <div className="mb-4">
              <label className="block text-xs text-muted mb-1">Follow-up Signal</label>
              <select
                value={followUpSignal}
                onChange={(e) => setFollowUpSignal(e.target.value)}
                className="input input-sm w-full"
              >
                <option value="">-- Select --</option>
                <option value="needs_attention">Needs Attention</option>
                <option value="scheduled_recall">Scheduled Recall</option>
                <option value="success_confirmed">Success Confirmed</option>
                <option value="escalate">Escalate</option>
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-xs text-muted mb-1">Notes</label>
              <textarea
                value={followUpNotes}
                onChange={(e) => setFollowUpNotes(e.target.value)}
                rows={3}
                className="input input-sm w-full"
                placeholder="Add follow-up notes..."
              />
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setSelectedApp(null);
                  setFollowUpSignal('');
                  setFollowUpNotes('');
                }}
                className="btn btn-ghost btn-sm"
              >
                Cancel
              </button>
              <button onClick={handleUpdateFollowUp} className="btn btn-sm">
                Save Follow-up
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function DeliveredAppsPanelWithErrorBoundary(props: DeliveredAppsPanelProps) {
  return (
    <DeliveredAppsErrorBoundary>
      <DeliveredAppsPanel {...props} />
    </DeliveredAppsErrorBoundary>
  );
}

export default DeliveredAppsPanelWithErrorBoundary;