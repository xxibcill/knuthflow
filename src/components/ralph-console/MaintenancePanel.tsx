// ─────────────────────────────────────────────────────────────────────────────
// Maintenance Panel - Maintenance Run UI (Phase 19)
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useCallback, useEffect } from 'react';

export interface MaintenanceRun {
  id: string;
  appId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  triggerType: 'scheduled' | 'regression' | 'manual';
  triggerReason: string;
  iterationCount: number;
  outcome: 'success' | 'failure' | 'cancelled' | null;
  createdAt: number;
  startedAt: number | null;
  completedAt: number | null;
}

export interface MaintenancePanelProps {
  appId: string;
  workspacePath: string | null;
}

export function MaintenancePanel({ appId, workspacePath }: MaintenancePanelProps) {
  const [maintenanceRuns, setMaintenanceRuns] = useState<MaintenanceRun[]>([]);
  const [activeMaintenanceRuns, setActiveMaintenanceRuns] = useState<MaintenanceRun[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMaintenanceRuns = useCallback(async () => {
    if (!appId) return;

    setIsLoading(true);
    setError(null);

    try {
      const [runsResult, activeResult] = await Promise.all([
        window.ralph.maintenance.list(appId, 20),
        window.ralph.maintenance.listActive(),
      ]);

      setMaintenanceRuns(runsResult || []);
      setActiveMaintenanceRuns((activeResult || []).filter((r: MaintenanceRun) => r.appId === appId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load maintenance runs');
    } finally {
      setIsLoading(false);
    }
  }, [appId]);

  useEffect(() => {
    loadMaintenanceRuns();
  }, [loadMaintenanceRuns]);

  const handleTriggerMaintenance = useCallback(async () => {
    if (!appId || !workspacePath) return;

    setIsLoading(true);
    setError(null);

    try {
      await window.ralph.maintenance.create({
        appId,
        triggerType: 'manual',
        triggerReason: 'Manually triggered by operator',
      });
      await loadMaintenanceRuns();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to trigger maintenance');
    } finally {
      setIsLoading(false);
    }
  }, [appId, workspacePath, loadMaintenanceRuns]);

  const handleForceCheck = useCallback(async () => {
    if (!appId) return;

    setIsLoading(true);
    setError(null);

    try {
      await window.ralph.monitoring.forceCheck(appId);
      await loadMaintenanceRuns();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run health check');
    } finally {
      setIsLoading(false);
    }
  }, [appId, loadMaintenanceRuns]);

  const formatDuration = (start: number | null, end: number | null): string => {
    if (!start) return 'N/A';
    const endTime = end || Date.now();
    const durationMs = endTime - start;
    const minutes = Math.floor(durationMs / 60000);
    const seconds = Math.floor((durationMs % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  const getStatusBadge = (status: MaintenanceRun['status']) => {
    const styles: Record<string, string> = {
      pending: 'badge badge-neutral',
      running: 'badge badge-info',
      completed: 'badge badge-success',
      failed: 'badge badge-error',
      cancelled: 'badge badge-warning',
    };
    return styles[status] || 'badge badge-neutral';
  };

  const getTriggerBadge = (triggerType: MaintenanceRun['triggerType']) => {
    const styles: Record<string, string> = {
      scheduled: 'badge badge-info',
      regression: 'badge badge-warning',
      manual: 'badge badge-success',
    };
    return styles[triggerType] || 'badge badge-neutral';
  };

  return (
    <div className="section-shell">
      <div className="section-header">
        <div>
          <h2 className="section-title">Maintenance Runs</h2>
          <p className="section-lead">Monitor and manage automated maintenance for delivered apps.</p>
        </div>
        <div className="toolbar-inline">
          <button
            onClick={handleForceCheck}
            disabled={isLoading || !appId}
            className="btn btn-ghost btn-sm"
            title="Run health check now"
          >
            Run Health Check
          </button>
          <button
            onClick={handleTriggerMaintenance}
            disabled={isLoading || !appId || !workspacePath}
            className="btn btn-sm"
            title="Manually trigger a maintenance run"
          >
            Trigger Maintenance
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 border border-red-500 rounded">
          <p className="text-red-300">{error}</p>
        </div>
      )}

      {/* Active Maintenance Runs */}
      {activeMaintenanceRuns.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">Active Maintenance Runs</h3>
          <div className="space-y-2">
            {activeMaintenanceRuns.map((run) => (
              <div key={run.id} className="surface-panel p-4 border-l-4 border-blue-500">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={getStatusBadge(run.status)}>{run.status}</span>
                      <span className={getTriggerBadge(run.triggerType)}>{run.triggerType}</span>
                    </div>
                    <p className="text-sm text-muted mt-1">{run.triggerReason}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm">Started: {run.startedAt ? new Date(run.startedAt).toLocaleString() : 'N/A'}</p>
                    {run.startedAt && <p className="text-sm text-muted">Duration: {formatDuration(run.startedAt, null)}</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Maintenance Run History */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Maintenance History</h3>
        {isLoading && maintenanceRuns.length === 0 ? (
          <div className="text-center p-8 text-muted">Loading maintenance runs...</div>
        ) : maintenanceRuns.length === 0 ? (
          <div className="text-center p-8 text-muted">
            No maintenance runs yet. Maintenance runs are created automatically when regressions are detected or manually triggered.
          </div>
        ) : (
          <div className="space-y-2">
            {maintenanceRuns.map((run) => (
              <div key={run.id} className="surface-panel p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={getStatusBadge(run.status)}>{run.status}</span>
                      <span className={getTriggerBadge(run.triggerType)}>{run.triggerType}</span>
                      {run.outcome && (
                        <span className={`badge ${run.outcome === 'success' ? 'badge-success' : run.outcome === 'failure' ? 'badge-error' : 'badge-warning'}`}>
                          {run.outcome}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted mt-1">{run.triggerReason}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm">Created: {new Date(run.createdAt).toLocaleString()}</p>
                    {run.startedAt && (
                      <p className="text-sm text-muted">
                        Duration: {formatDuration(run.startedAt, run.completedAt)}
                      </p>
                    )}
                    {run.iterationCount > 0 && (
                      <p className="text-sm text-muted">Iterations: {run.iterationCount}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default MaintenancePanel;
