import { useState, useEffect, useCallback } from 'react';
import type { Blueprint, BlueprintVersion, BlueprintUsageStats, BlueprintWithVersion } from './BlueprintBrowser';

interface BlueprintDetailViewProps {
  blueprint: BlueprintWithVersion;
  onEdit: (blueprint: BlueprintWithVersion) => void;
  onDelete: (blueprintId: string) => void;
  onCreateVersion: (blueprintId: string, newVersion: string) => void;
  onBack: () => void;
}

export function BlueprintDetailView({
  blueprint,
  onEdit,
  onDelete,
  onCreateVersion,
  onBack,
}: BlueprintDetailViewProps) {
  const [versions, setVersions] = useState<BlueprintVersion[]>([]);
  const [usageStats, setUsageStats] = useState<BlueprintUsageStats[]>([]);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [newVersionInput, setNewVersionInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showVersionCompare, setShowVersionCompare] = useState(false);
  const [compareVersionIds, setCompareVersionIds] = useState<string[]>([]);

  const loadVersions = useCallback(async () => {
    setIsLoading(true);
    try {
      const vers = await window.knuthflow.blueprint.listVersions(blueprint.id);
      setVersions(vers);
      const stats = await window.knuthflow.blueprint.getUsageStats(blueprint.id, 50);
      setUsageStats(stats);
    } catch (error) {
      console.error('Failed to load versions:', error);
    } finally {
      setIsLoading(false);
    }
  }, [blueprint.id]);

  useEffect(() => {
    loadVersions();
  }, [loadVersions]);

  const selectedVersion = versions.find(v => v.id === selectedVersionId) || versions[0];

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleCreateVersion = useCallback(async () => {
    if (!newVersionInput.trim()) return;

    try {
      const result = await window.knuthflow.blueprint.createNewVersion(
        blueprint.id,
        newVersionInput,
      );
      if (result.success) {
        setNewVersionInput('');
        loadVersions();
      }
    } catch (error) {
      console.error('Failed to create version:', error);
    }
  }, [blueprint.id, newVersionInput, loadVersions]);

  const handleDelete = useCallback(async () => {
    try {
      await window.knuthflow.blueprint.delete(blueprint.id);
      onDelete(blueprint.id);
    } catch (error) {
      console.error('Failed to delete blueprint:', error);
    }
  }, [blueprint.id, onDelete]);

  const handleCompareVersions = useCallback(async () => {
    if (compareVersionIds.length !== 2) return;

    try {
      const result = await window.knuthflow.blueprint.compareVersions(
        compareVersionIds[0],
        compareVersionIds[1],
      );
      if (result.success && result.comparison) {
        setShowVersionCompare(true);
      }
    } catch (error) {
      console.error('Failed to compare versions:', error);
    }
  }, [compareVersionIds]);

  const successCount = usageStats.filter(s => s.outcome === 'success').length;
  const failureCount = usageStats.filter(s => s.outcome === 'failure').length;
  const totalBuildTime = usageStats.reduce((acc, s) => acc + (s.buildTimeMs || 0), 0);
  const avgBuildTime = usageStats.length > 0 ? totalBuildTime / usageStats.length / 1000 : 0;

  return (
    <div className="blueprint-detail-view">
      <div className="flex justify-between items-start mb-6">
        <div>
          <button type="button" onClick={onBack} className="btn btn-ghost btn-sm mb-2">
            ← Back to Library
          </button>
          <h3 className="section-title">{blueprint.name}</h3>
          <p className="text-muted">{blueprint.description || 'No description'}</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onEdit(blueprint)}
            className="btn btn-ghost btn-sm"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="btn btn-ghost btn-sm text-red-400"
          >
            Delete
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="stat-card">
          <div className="stat-label">Usage Count</div>
          <div className="stat-value">{blueprint.usageCount}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Success Rate</div>
          <div className="stat-value">
            {blueprint.successRate !== null
              ? `${Math.round(blueprint.successRate * 100)}%`
              : 'N/A'}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Uses</div>
          <div className="stat-value">{usageStats.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Avg Build Time</div>
          <div className="stat-value">{avgBuildTime.toFixed(1)}s</div>
        </div>
      </div>

      <div className="card mb-6">
        <div className="card-header">
          <h4>Version History</h4>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="New version (e.g., 1.1.0)"
              value={newVersionInput}
              onChange={e => setNewVersionInput(e.target.value)}
              className="input input-sm w-32"
            />
            <button
              type="button"
              onClick={handleCreateVersion}
              disabled={!newVersionInput.trim()}
              className="btn btn-primary btn-sm"
            >
              New Version
            </button>
          </div>
        </div>
        <div className="card-body">
          {isLoading ? (
            <div className="loading-state">Loading versions...</div>
          ) : versions.length === 0 ? (
            <div className="empty-state">No versions yet</div>
          ) : (
            <div className="version-list">
              {versions.map((v, index) => (
                <div
                  key={v.id}
                  className={`version-item ${selectedVersion?.id === v.id ? 'selected' : ''}`}
                  onClick={() => setSelectedVersionId(v.id)}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="version-badge">v{v.version}</span>
                      {index === 0 && <span className="badge badge-info ml-2">Latest</span>}
                    </div>
                    <div className="flex gap-2 items-center">
                      <input
                        type="checkbox"
                        checked={compareVersionIds.includes(v.id)}
                        onChange={e => {
                          if (e.target.checked) {
                            if (compareVersionIds.length < 2) {
                              setCompareVersionIds([...compareVersionIds, v.id]);
                            }
                          } else {
                            setCompareVersionIds(compareVersionIds.filter(id => id !== v.id));
                          }
                        }}
                        disabled={!compareVersionIds.includes(v.id) && compareVersionIds.length >= 2}
                      />
                      <span className="text-xs text-muted">
                        {formatDate(v.createdAt)}
                      </span>
                    </div>
                  </div>
                  <div className="text-sm text-muted mt-1">
                    {v.usageCount} uses • {v.acceptanceGates.length} gates • {v.learnedRules.length} rules
                  </div>
                </div>
              ))}
            </div>
          )}
          {compareVersionIds.length === 2 && (
            <button
              type="button"
              onClick={handleCompareVersions}
              className="btn btn-ghost btn-sm mt-2"
            >
              Compare Selected Versions
            </button>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h4>Usage History</h4>
        </div>
        <div className="card-body">
          {usageStats.length === 0 ? (
            <div className="empty-state">No usage history yet</div>
          ) : (
            <div className="usage-list">
              <div className="grid grid-cols-5 gap-2 text-xs text-muted mb-2 px-2">
                <span>Date</span>
                <span>Version</span>
                <span>Outcome</span>
                <span>Build Time</span>
                <span>Iterations</span>
              </div>
              {usageStats.map(stat => (
                <div key={stat.id} className="grid grid-cols-5 gap-2 text-sm py-2 px-2 border-b border-border">
                  <span>{formatDate(stat.createdAt)}</span>
                  <span>{stat.versionId ? 'v' : 'N/A'}</span>
                  <span className={stat.outcome === 'success' ? 'text-green-400' : 'text-red-400'}>
                    {stat.outcome}
                  </span>
                  <span>{stat.buildTimeMs ? `${(stat.buildTimeMs / 1000).toFixed(1)}s` : 'N/A'}</span>
                  <span>{stat.iterationCount}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h4 className="section-title mb-4">Delete Blueprint?</h4>
            <p className="text-muted mb-4">
              Are you sure you want to delete "{blueprint.name}"? This action cannot be undone.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="btn btn-ghost"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="btn btn-danger"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {showVersionCompare && (
        <div className="modal-overlay">
          <div className="modal-content modal-lg">
            <h4 className="section-title mb-4">Version Comparison</h4>
            <div className="card-body">
              <p className="text-muted">Version comparison view would show here.</p>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowVersionCompare(false)}
                className="btn btn-ghost"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BlueprintDetailView;