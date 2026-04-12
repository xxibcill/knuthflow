import type { RalphPhase } from './RalphConsole.types';

interface TimelineEvent {
  iteration: number;
  phase: RalphPhase;
  timestamp: number;
  selectedItem?: string;
  artifactCount?: number;
  durationMs?: number;
  outcome?: 'success' | 'failed' | 'skipped';
}

interface RalphPhaseTimelineProps {
  events: TimelineEvent[];
  currentIteration: number;
  onSelectEvent?: (event: TimelineEvent) => void;
}

const phaseLabels: Record<RalphPhase, string> = {
  idle: 'Idle',
  starting: 'Start',
  planning: 'Plan',
  executing: 'Execute',
  validating: 'Validate',
  paused: 'Paused',
  failed: 'Failed',
  cancelled: 'Cancelled',
  completed: 'Done',
};

function getPhaseBadge(phase: RalphPhase) {
  if (phase === 'completed') return 'badge badge-success';
  if (phase === 'failed') return 'badge badge-danger';
  if (phase === 'cancelled') return 'badge badge-warning';
  if (phase === 'paused' || phase === 'starting') return 'badge badge-warning';
  if (phase === 'planning' || phase === 'executing' || phase === 'validating') return 'badge badge-info';
  return 'badge badge-neutral';
}

export function RalphPhaseTimeline({ events, currentIteration, onSelectEvent }: RalphPhaseTimelineProps) {
  const formatTime = (timestamp: number) => (
    new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  );

  const formatDuration = (ms?: number) => {
    if (!ms) return '—';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  if (events.length === 0) {
    return (
      <div className="empty-state">
        <div>
          <h3 className="text-lg font-semibold">No timeline events</h3>
          <p className="mt-2 text-sm text-muted">Iteration milestones will appear once a Ralph run has progressed.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="section-shell">
      <div className="section-header">
        <div>
          <h2 className="section-title">Phase Timeline</h2>
          <p className="section-lead">Ordered view of phase transitions, selected items, and iteration timing.</p>
        </div>
        <div className="toolbar-inline">
          <span className="badge badge-neutral">{events.length} events</span>
        </div>
      </div>

      <div className="list-pane">
        <div className="stack-sm">
          {events.map((event, index) => {
            const isCurrent = event.iteration === currentIteration;
            return (
              <button
                key={`${event.iteration}-${event.phase}-${index}`}
                onClick={() => onSelectEvent?.(event)}
                className={`list-card text-left ${isCurrent ? 'selected' : ''}`}
              >
                <div className="flex min-w-0 flex-1 items-start gap-4">
                  <div className="mt-1">
                    <span className={`status-dot ${event.phase === 'failed' ? 'danger' : event.phase === 'completed' ? 'success' : event.phase === 'cancelled' ? 'warning' : 'info'}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <h3 className="list-card-title">Iteration {event.iteration}</h3>
                      <span className={getPhaseBadge(event.phase)}>{phaseLabels[event.phase] || event.phase}</span>
                      {isCurrent && <span className="badge badge-info">Current</span>}
                    </div>
                    {event.selectedItem && (
                      <p className="mb-2 truncate text-sm text-muted">{event.selectedItem}</p>
                    )}
                    <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted">
                      <span>{formatTime(event.timestamp)}</span>
                      {event.durationMs && <span>{formatDuration(event.durationMs)}</span>}
                      {event.artifactCount !== undefined && <span>{event.artifactCount} artifacts</span>}
                      {event.outcome && <span>{event.outcome}</span>}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
