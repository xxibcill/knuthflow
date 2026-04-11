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
  completed: 'Done',
};

const getPhaseColor = (phase: RalphPhase): string => {
  switch (phase) {
    case 'starting':
      return 'bg-yellow-500';
    case 'planning':
      return 'bg-purple-500';
    case 'executing':
      return 'bg-blue-500';
    case 'validating':
      return 'bg-cyan-500';
    case 'completed':
      return 'bg-green-500';
    case 'failed':
      return 'bg-red-500';
    case 'paused':
      return 'bg-yellow-500';
    default:
      return 'bg-gray-500';
  }
};

const getOutcomeColor = (outcome?: TimelineEvent['outcome']) => {
  switch (outcome) {
    case 'success':
      return 'bg-green-400';
    case 'failed':
      return 'bg-red-400';
    case 'skipped':
      return 'bg-gray-400';
    default:
      return 'bg-blue-400';
  }
};

export function RalphPhaseTimeline({ events, currentIteration, onSelectEvent }: RalphPhaseTimelineProps) {
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return '—';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  };

  if (events.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-gray-500 text-sm">
        No timeline events yet
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Timeline header */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-800 border-b border-gray-700">
        <h3 className="text-sm font-medium text-white">Phase Timeline</h3>
        <span className="text-xs text-gray-400">
          {events.length} event{events.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Timeline body */}
      <div className="flex-1 overflow-y-auto p-2">
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-700" />

          {/* Events */}
          <div className="space-y-1">
            {events.map((event, index) => {
              const isCurrent = event.iteration === currentIteration;
              const isRunning = isCurrent && event.phase !== 'completed' && event.phase !== 'failed';

              return (
                <div
                  key={`${event.iteration}-${event.phase}-${index}`}
                  onClick={() => onSelectEvent?.(event)}
                  className={`
                    relative flex items-start gap-3 p-2 rounded cursor-pointer
                    transition-colors duration-150
                    ${isCurrent ? 'bg-blue-900/30 ring-1 ring-blue-500' : 'hover:bg-gray-800'}
                  `}
                >
                  {/* Timeline dot */}
                  <div className="relative z-10 flex-shrink-0 mt-1">
                    <div className={`
                      w-4 h-4 rounded-full flex items-center justify-center
                      ${getPhaseColor(event.phase)}
                      ${isRunning ? 'ring-2 ring-blue-400 ring-offset-2 ring-offset-gray-900 animate-pulse' : ''}
                    `}>
                      {event.outcome && (
                        <div className={`w-2 h-2 rounded-full ${getOutcomeColor(event.outcome)}`} />
                      )}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-white">
                        Iteration {event.iteration}
                      </span>
                      <span className={`
                        text-xs px-1.5 py-0.5 rounded
                        ${event.phase === 'completed' ? 'bg-green-900/50 text-green-300' :
                          event.phase === 'failed' ? 'bg-red-900/50 text-red-300' :
                          event.phase === 'paused' ? 'bg-yellow-900/50 text-yellow-300' :
                          'bg-gray-700 text-gray-300'}
                      `}>
                        {phaseLabels[event.phase] || event.phase}
                      </span>
                      {isCurrent && (
                        <span className="text-xs text-blue-400">Current</span>
                      )}
                    </div>

                    {event.selectedItem && (
                      <p className="text-xs text-gray-400 truncate mb-1">
                        {event.selectedItem}
                      </p>
                    )}

                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span>{formatTime(event.timestamp)}</span>
                      {event.durationMs && (
                        <span title="Duration">{formatDuration(event.durationMs)}</span>
                      )}
                      {event.artifactCount !== undefined && (
                        <span title="Artifacts">{event.artifactCount} artifacts</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}