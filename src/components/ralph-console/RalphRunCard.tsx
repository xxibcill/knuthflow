import type { RalphRunDashboardItem, RalphPhase } from './RalphConsole.types';

interface RalphRunCardProps {
  run: RalphRunDashboardItem;
  isSelected: boolean;
  onSelect: (run: RalphRunDashboardItem) => void;
  onOpenWorkspace: (workspacePath: string) => void;
}

export function RalphRunCard({ run, isSelected, onSelect, onOpenWorkspace }: RalphRunCardProps) {
  const getStatusColor = (status: RalphRunDashboardItem['status']) => {
    switch (status) {
      case 'running':
        return 'bg-blue-500';
      case 'paused':
        return 'bg-yellow-500';
      case 'completed':
        return 'bg-green-500';
      case 'failed':
      case 'cancelled':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getPhaseColor = (phase: RalphPhase) => {
    switch (phase) {
      case 'idle':
        return 'text-gray-400';
      case 'starting':
        return 'text-yellow-400';
      case 'planning':
        return 'text-purple-400';
      case 'executing':
        return 'text-blue-400';
      case 'validating':
        return 'text-cyan-400';
      case 'paused':
        return 'text-yellow-400';
      case 'failed':
        return 'text-red-400';
      case 'completed':
        return 'text-green-400';
      default:
        return 'text-gray-400';
    }
  };

  const formatDuration = (startTime: number | null, endTime: number | null) => {
    if (!startTime) return '—';
    const end = endTime ?? Date.now();
    const durationMs = end - startTime;
    const seconds = Math.floor(durationMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div
      onClick={() => onSelect(run)}
      className={`
        relative p-4 rounded-lg border cursor-pointer transition-all duration-150
        ${isSelected
          ? 'bg-gray-700 border-blue-500 ring-1 ring-blue-500'
          : 'bg-gray-800 border-gray-600 hover:bg-gray-700 hover:border-gray-500'
        }
      `}
    >
      {/* Status indicator bar */}
      <div className={`absolute top-0 left-0 right-0 h-1 rounded-t-lg ${getStatusColor(run.status)}`} />

      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-medium text-white truncate pr-2">{run.name}</h3>
          <p className="text-xs text-gray-400 truncate mt-0.5">{run.workspaceName}</p>
        </div>
        <span className={`
          px-2 py-0.5 rounded text-xs font-medium flex-shrink-0
          ${run.status === 'running' ? 'bg-blue-900 text-blue-300' :
            run.status === 'paused' ? 'bg-yellow-900 text-yellow-300' :
            run.status === 'completed' ? 'bg-green-900 text-green-300' :
            run.status === 'failed' || run.status === 'cancelled' ? 'bg-red-900 text-red-300' :
            'bg-gray-700 text-gray-300'}
        `}>
          {run.status}
        </span>
      </div>

      {/* Phase indicator */}
      <div className="flex items-center gap-2 mb-3">
        <span className={`text-sm font-medium ${getPhaseColor(run.phase)}`}>
          {run.phase.charAt(0).toUpperCase() + run.phase.slice(1)}
        </span>
        {run.phase !== 'idle' && run.phase !== 'completed' && run.phase !== 'failed' && (
          <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
        )}
      </div>

      {/* Selected item */}
      {run.selectedItem && (
        <div className="mb-3 p-2 bg-gray-900 rounded border border-gray-700">
          <p className="text-xs text-gray-400 mb-0.5">Selected Item</p>
          <p className="text-sm text-white truncate">{run.selectedItem.title}</p>
        </div>
      )}

      {/* Metrics row */}
      <div className="flex items-center gap-4 text-xs text-gray-400">
        <div title={`${run.iterationCount} iterations`}>
          <span className="text-gray-500">Iter:</span>{' '}
          <span className="text-white">{run.iterationCount}</span>
        </div>
        <div title={`${run.loopCount} loops`}>
          <span className="text-gray-500">Loop:</span>{' '}
          <span className="text-white">{run.loopCount}</span>
        </div>
        <div title={run.startTime ? formatDuration(run.startTime, run.endTime) : 'Not started'}>
          <span className="text-gray-500">Duration:</span>{' '}
          <span className="text-white">{formatDuration(run.startTime, run.endTime)}</span>
        </div>
        {run.startTime && (
          <div title="Start time">
            <span className="text-gray-500">Started:</span>{' '}
            <span className="text-white">{formatTime(run.startTime)}</span>
          </div>
        )}
      </div>

      {/* Safety state indicator */}
      {run.safetyState && (
        <div className="mt-3 pt-3 border-t border-gray-700">
          <div className="flex items-center gap-3 text-xs">
            {run.safetyState.circuitBreakerOpen && (
              <span className="flex items-center gap-1 text-red-400">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
                Circuit Open
              </span>
            )}
            {run.safetyState.rateLimitCallsRemaining < 10 && (
              <span className="text-yellow-400">
                Rate: {run.safetyState.rateLimitCallsRemaining} calls left
              </span>
            )}
            {run.safetyState.noProgressCount > 0 && (
              <span className="text-orange-400">
                No progress: {run.safetyState.noProgressCount}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Error message */}
      {run.error && (
        <div className="mt-3 pt-3 border-t border-red-800">
          <p className="text-xs text-red-400 flex items-start gap-1">
            <svg className="w-3 h-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="truncate">{run.error}</span>
          </p>
        </div>
      )}

      {/* Workspace link */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onOpenWorkspace(run.workspacePath);
        }}
        className="mt-3 text-xs text-blue-400 hover:text-blue-300 hover:underline truncate"
        title={run.workspacePath}
      >
        {run.workspacePath}
      </button>
    </div>
  );
}