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
const MAX_FILES_DISPLAY = 3;
const TRUNCATE_SNAPSHOT_LENGTH = 200;

const formatTimestamp = (timestamp: number) => {
  return new Date(timestamp).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getOutcomeColor = (response: string) => {
  if (response.includes('error') || response.includes('failed')) {
    return 'text-red-400';
  }
  if (response.includes('success') || response.includes('completed')) {
    return 'text-green-400';
  }
  return 'text-gray-400';
};

export function RalphLoopHistoryPanel({
  summaries,
  snapshots,
  selectedSnapshotId,
  onSelectSnapshot,
  onCompareSnapshots,
  onViewArtifact,
}: RalphLoopHistoryPanelProps) {
  const [viewMode, setViewMode] = useState<'summaries' | 'snapshots'>('summaries');

  if (summaries.length === 0 && snapshots.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-gray-500 text-sm">
        No loop history available
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-800 border-b border-gray-700">
        <h3 className="text-sm font-medium text-white">Loop History</h3>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setViewMode('summaries')}
            className={`px-2 py-1 text-xs rounded ${
              viewMode === 'summaries'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Summaries
          </button>
          <button
            onClick={() => setViewMode('snapshots')}
            className={`px-2 py-1 text-xs rounded ${
              viewMode === 'snapshots'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Snapshots
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {viewMode === 'summaries' ? (
          <div className="divide-y divide-gray-800">
            {summaries.map((summary) => (
              <div
                key={summary.id}
                className="p-3 hover:bg-gray-800 cursor-pointer"
                onClick={() => onViewArtifact?.(summary.id)}
              >
                <div className="flex items-start justify-between mb-1">
                  <span className="text-sm font-medium text-white">
                    Iteration {summary.iteration}
                  </span>
                  <span className="text-xs text-gray-500">
                    {formatTimestamp(summary.createdAt)}
                  </span>
                </div>

                {/* Prompt preview */}
                <div className="mb-2 p-2 bg-gray-900 rounded border border-gray-700">
                  <p className="text-xs text-gray-500 mb-1">Prompt</p>
                  <p className="text-xs text-gray-300 line-clamp-3 font-mono">
                    {summary.prompt.slice(0, TRUNCATE_PROMPT_LENGTH)}
                    {summary.prompt.length > TRUNCATE_PROMPT_LENGTH && '...'}
                  </p>
                </div>

                {/* Selected files */}
                {summary.selectedFiles.length > 0 && (
                  <div className="mb-2">
                    <p className="text-xs text-gray-500 mb-1">
                      Files: {summary.selectedFiles.length}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {summary.selectedFiles.slice(0, MAX_FILES_DISPLAY).map((file, i) => (
                        <span
                          key={i}
                          className="text-xs px-1.5 py-0.5 bg-gray-700 text-gray-300 rounded truncate max-w-32"
                        >
                          {file.split('/').pop()}
                        </span>
                      ))}
                      {summary.selectedFiles.length > MAX_FILES_DISPLAY && (
                        <span className="text-xs text-gray-500">
                          +{summary.selectedFiles.length - MAX_FILES_DISPLAY} more
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Response preview */}
                <div>
                  <p className={`text-xs ${getOutcomeColor(summary.response)}`}>
                    {summary.response.slice(0, TRUNCATE_RESPONSE_LENGTH)}
                    {summary.response.length > TRUNCATE_RESPONSE_LENGTH && '...'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="divide-y divide-gray-800">
            {snapshots.map((snapshot, index) => {
              const isSelected = snapshot.id === selectedSnapshotId;
              const prevSnapshot = index < snapshots.length - 1 ? snapshots[index + 1] : null;

              return (
                <div
                  key={snapshot.id}
                  onClick={() => onSelectSnapshot?.(snapshot)}
                  className={`
                    p-3 cursor-pointer transition-colors
                    ${isSelected ? 'bg-blue-900/30 ring-1 ring-blue-500' : 'hover:bg-gray-800'}
                  `}
                >
                  <div className="flex items-start justify-between mb-1">
                    <span className="text-sm font-medium text-white">
                      Plan Snapshot — Iteration {snapshot.iteration}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatTimestamp(snapshot.createdAt)}
                    </span>
                  </div>

                  {/* Plan content preview */}
                  <div className="p-2 bg-gray-900 rounded border border-gray-700 mb-2">
                    <p className="text-xs text-gray-500 mb-1">Plan Content</p>
                    <p className="text-xs text-gray-300 line-clamp-4 font-mono">
                      {snapshot.planContent.slice(0, TRUNCATE_SNAPSHOT_LENGTH)}
                      {snapshot.planContent.length > TRUNCATE_SNAPSHOT_LENGTH && '...'}
                    </p>
                  </div>

                  {/* Compare button */}
                  {prevSnapshot && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onCompareSnapshots?.([snapshot.id, prevSnapshot.id]);
                      }}
                      className="text-xs text-blue-400 hover:text-blue-300"
                    >
                      Compare with previous
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

