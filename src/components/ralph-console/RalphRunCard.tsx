import type { RalphPhase, RalphRunDashboardItem } from './RalphConsole.types';

interface RalphRunCardProps {
  run: RalphRunDashboardItem;
  isSelected: boolean;
  onSelect: (run: RalphRunDashboardItem) => void;
  onOpenWorkspace: (workspacePath: string) => void;
}

function getStatusBadge(status: RalphRunDashboardItem['status']) {
  if (status === 'running') return 'badge badge-info';
  if (status === 'paused') return 'badge badge-warning';
  if (status === 'completed') return 'badge badge-success';
  if (status === 'failed' || status === 'cancelled') return 'badge badge-danger';
  return 'badge badge-neutral';
}

function getPhaseTone(phase: RalphPhase) {
  if (phase === 'failed') return 'text-red-400';
  if (phase === 'completed') return 'text-green-400';
  if (phase === 'paused' || phase === 'starting') return 'text-yellow-400';
  if (phase === 'planning' || phase === 'executing' || phase === 'validating') return 'text-blue-400';
  return 'text-muted';
}

export function RalphRunCard({ run, isSelected, onSelect, onOpenWorkspace }: RalphRunCardProps) {
  const formatDuration = (startTime: number | null, endTime: number | null) => {
    if (!startTime) return '—';
    const end = endTime ?? Date.now();
    const durationMs = end - startTime;
    const seconds = Math.floor(durationMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  const formatTime = (timestamp: number) => (
    new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  );

  return (
    <div onClick={() => onSelect(run)} className={`list-card cursor-pointer ${isSelected ? 'selected' : ''}`}>
      <div className="min-w-0 flex-1">
        <div className="mb-2 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="list-card-title truncate">{run.name}</h3>
            <p className="mt-1 truncate text-xs text-muted">{run.workspaceName}</p>
          </div>
          <span className={getStatusBadge(run.status)}>{run.status}</span>
        </div>

        <div className="mb-3 flex items-center gap-2">
          <span className={`text-sm font-semibold ${getPhaseTone(run.phase)}`}>
            {run.phase.charAt(0).toUpperCase() + run.phase.slice(1)}
          </span>
          {run.phase !== 'idle' && run.phase !== 'completed' && run.phase !== 'failed' && (
            <span className="status-dot info" />
          )}
        </div>

        {run.selectedItem && (
          <div className="surface-panel-inset mb-3 px-3 py-2">
            <p className="metric-label">Selected Item</p>
            <p className="m-0 text-sm">{run.selectedItem.title}</p>
          </div>
        )}

        <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted">
          <span><strong className="text-[var(--text-primary)]">{run.iterationCount}</strong> iterations</span>
          <span><strong className="text-[var(--text-primary)]">{run.loopCount}</strong> loops</span>
          <span><strong className="text-[var(--text-primary)]">{formatDuration(run.startTime, run.endTime)}</strong> elapsed</span>
          {run.startTime && <span>{formatTime(run.startTime)}</span>}
        </div>

        {run.safetyState && (
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            {run.safetyState.circuitBreakerOpen && <span className="badge badge-danger">Circuit Open</span>}
            {run.safetyState.rateLimitCallsRemaining < 10 && (
              <span className="badge badge-warning">{run.safetyState.rateLimitCallsRemaining} calls left</span>
            )}
            {run.safetyState.noProgressCount > 0 && (
              <span className="badge badge-neutral">No progress {run.safetyState.noProgressCount}</span>
            )}
          </div>
        )}

        {run.error && (
          <p className="mt-3 text-xs text-red-400" title={run.error}>{run.error}</p>
        )}

        <button
          onClick={(event) => {
            event.stopPropagation();
            onOpenWorkspace(run.workspacePath);
          }}
          className="mt-3 text-left text-xs text-blue-400 hover:text-blue-300"
          title={run.workspacePath}
        >
          {run.workspacePath}
        </button>
      </div>
    </div>
  );
}
