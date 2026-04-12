import { useState } from 'react';
import type { LoopSummary, PlanSnapshot } from './RalphConsole.types';

interface RalphLoopHistoryPanelProps {
  summaries: LoopSummary[];
  snapshots: PlanSnapshot[];
  selectedSnapshotId?: string | null;
  onSelectSnapshot?: (snapshot: PlanSnapshot) => void;
  onCompareSnapshots?: (snapshotIds: [string, string]) => void;
  onViewArtifact?: (summaryId: string) => void;
}

const TRUNCATE_PROMPT_LENGTH = 150;
const TRUNCATE_RESPONSE_LENGTH = 100;
const TRUNCATE_SNAPSHOT_LENGTH = 200;

export function RalphLoopHistoryPanel({
  summaries,
  snapshots,
  selectedSnapshotId,
  onSelectSnapshot,
  onCompareSnapshots,
  onViewArtifact,
}: RalphLoopHistoryPanelProps) {
  const [viewMode, setViewMode] = useState<'summaries' | 'snapshots'>('summaries');

  const formatTimestamp = (timestamp: number) => (
    new Date(timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  );

  if (summaries.length === 0 && snapshots.length === 0) {
    return (
      <div className="empty-state">
        <div>
          <h3 className="text-lg font-semibold">No loop history available</h3>
          <p className="mt-2 text-sm text-muted">Snapshots and iteration summaries appear after Ralph completes work loops.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="section-shell">
      <div className="section-header">
        <div>
          <h2 className="section-title">Loop History</h2>
          <p className="section-lead">Inspect prompts, responses, and plan snapshots for each pass through the loop.</p>
        </div>
        <div className="toolbar-inline">
          <div className="segmented-control">
            <button
              onClick={() => setViewMode('summaries')}
              className={`segmented-button ${viewMode === 'summaries' ? 'active' : ''}`}
            >
              Summaries
            </button>
            <button
              onClick={() => setViewMode('snapshots')}
              className={`segmented-button ${viewMode === 'snapshots' ? 'active' : ''}`}
            >
              Snapshots
            </button>
          </div>
        </div>
      </div>

      <div className="list-pane">
        <div className="stack-sm">
          {viewMode === 'summaries' ? summaries.map(summary => (
            <div
              key={summary.id}
              onClick={() => onViewArtifact?.(summary.id)}
              className="list-card cursor-pointer"
            >
              <div className="min-w-0 flex-1">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <h3 className="list-card-title">Iteration {summary.iteration}</h3>
                  <span className="text-xs text-muted">{formatTimestamp(summary.createdAt)}</span>
                </div>
                <div className="code-surface mb-3 p-3">
                  <p className="metric-label">Prompt</p>
                  <p className="m-0 text-xs text-mono text-muted">
                    {summary.prompt.slice(0, TRUNCATE_PROMPT_LENGTH)}
                    {summary.prompt.length > TRUNCATE_PROMPT_LENGTH && '…'}
                  </p>
                </div>
                <p className="text-sm text-muted">
                  {summary.response.slice(0, TRUNCATE_RESPONSE_LENGTH)}
                  {summary.response.length > TRUNCATE_RESPONSE_LENGTH && '…'}
                </p>
              </div>
            </div>
          )) : snapshots.map((snapshot, index) => {
            const previousSnapshot = index < snapshots.length - 1 ? snapshots[index + 1] : null;
            return (
              <div
                key={snapshot.id}
                onClick={() => onSelectSnapshot?.(snapshot)}
                className={`list-card cursor-pointer ${selectedSnapshotId === snapshot.id ? 'selected' : ''}`}
              >
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <h3 className="list-card-title">Plan Snapshot {snapshot.iteration}</h3>
                    <span className="text-xs text-muted">{formatTimestamp(snapshot.createdAt)}</span>
                  </div>
                  <div className="code-surface p-3">
                    <p className="m-0 text-xs text-mono text-muted">
                      {snapshot.planContent.slice(0, TRUNCATE_SNAPSHOT_LENGTH)}
                      {snapshot.planContent.length > TRUNCATE_SNAPSHOT_LENGTH && '…'}
                    </p>
                  </div>
                  {previousSnapshot && (
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        onCompareSnapshots?.([snapshot.id, previousSnapshot.id]);
                      }}
                      className="mt-3 text-xs text-blue-400 hover:text-blue-300"
                    >
                      Compare with previous
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
