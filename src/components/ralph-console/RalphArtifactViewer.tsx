import { useState, useMemo } from 'react';
import type { RalphArtifact, ArtifactType } from './RalphConsole.types';

interface RalphArtifactViewerProps {
  artifacts: RalphArtifact[];
  selectedArtifact?: RalphArtifact | null;
  onSelectArtifact?: (artifact: RalphArtifact) => void;
  maxHeight?: string;
}

const artifactTypeLabels: Record<ArtifactType, string> = {
  compiler_output: 'Compiler Output',
  test_log: 'Test Log',
  diff: 'Diff',
  exit_metadata: 'Exit Metadata',
  generated_file: 'Generated File',
  validation_result: 'Validation Result',
  loop_summary: 'Loop Summary',
  prompt: 'Prompt',
  agent_output: 'Agent Output',
};

const artifactTypeIcons: Record<ArtifactType, string> = {
  compiler_output: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
  test_log: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  diff: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
  exit_metadata: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  generated_file: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  validation_result: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
  loop_summary: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
  prompt: 'M8 10h.01M8 14h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M20 10h.01M20 14h.01',
  agent_output: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z',
};

const getSeverityColor = (severity: RalphArtifact['severity']) => {
  switch (severity) {
    case 'error':
      return 'text-red-400 border-red-700';
    case 'warning':
      return 'text-yellow-400 border-yellow-700';
    case 'info':
      return 'text-blue-400 border-blue-700';
    default:
      return 'text-gray-400 border-gray-700';
  }
};

const formatTimestamp = (timestamp: number) => {
  return new Date(timestamp).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatDuration = (ms: number | null) => {
  if (ms === null) return '—';
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
};

export function RalphArtifactViewer({
  artifacts,
  selectedArtifact,
  onSelectArtifact,
  maxHeight = 'h-64',
}: RalphArtifactViewerProps) {
  const [filterType, setFilterType] = useState<ArtifactType | 'all'>('all');
  const [expandedArtifactId, setExpandedArtifactId] = useState<string | null>(null);

  const filteredArtifacts = useMemo(() => {
    if (filterType === 'all') return artifacts;
    return artifacts.filter(a => a.type === filterType);
  }, [artifacts, filterType]);

  const uniqueTypes = useMemo(() => {
    const types = new Set(artifacts.map(a => a.type));
    return Array.from(types);
  }, [artifacts]);

const TRUNCATE_PREVIEW_LENGTH = 300;
const TRUNCATE_DEFAULT_LENGTH = 200;

const truncateContent = (content: string, maxLength = TRUNCATE_DEFAULT_LENGTH) => {
  if (content.length <= maxLength) return content;
  return content.slice(0, maxLength) + '...';
};

  const handleSelectArtifact = (artifact: RalphArtifact) => {
    onSelectArtifact?.(artifact);
    setExpandedArtifactId(artifact.id);
  };

  const renderArtifactContent = (artifact: RalphArtifact, isExpanded: boolean) => {
    const content = isExpanded ? artifact.content : truncateContent(artifact.content, TRUNCATE_PREVIEW_LENGTH);
    return (
      <div className={`
        font-mono text-xs whitespace-pre-wrap break-words
        ${artifact.severity === 'error' ? 'text-red-300' : 'text-gray-300'}
      `}>
        {content}
      </div>
    );
  };

  return (
    <div className={`flex flex-col ${maxHeight}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-800 border-b border-gray-700">
        <h3 className="text-sm font-medium text-white">Artifacts</h3>
        <div className="flex items-center gap-2">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as ArtifactType | 'all')}
            className="text-xs bg-gray-700 text-gray-300 rounded px-2 py-1 border border-gray-600"
          >
            <option value="all">All Types</option>
            {uniqueTypes.map(type => (
              <option key={type} value={type}>
                {artifactTypeLabels[type]}
              </option>
            ))}
          </select>
          <span className="text-xs text-gray-400">
            {filteredArtifacts.length}
          </span>
        </div>
      </div>

      {/* Artifact list */}
      <div className="flex-1 overflow-y-auto">
        {filteredArtifacts.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-gray-500 text-sm">
            No artifacts available
          </div>
        ) : (
          <div className="divide-y divide-gray-800">
            {filteredArtifacts.map((artifact) => {
              const isExpanded = expandedArtifactId === artifact.id;
              const isSelected = selectedArtifact?.id === artifact.id;

              return (
                <div
                  key={artifact.id}
                  onClick={() => handleSelectArtifact(artifact)}
                  className={`
                    p-3 cursor-pointer transition-colors
                    ${isSelected ? 'bg-blue-900/30' : 'hover:bg-gray-800'}
                    border-l-2 ${getSeverityColor(artifact.severity)}
                  `}
                >
                  {/* Artifact header */}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={artifactTypeIcons[artifact.type]} />
                      </svg>
                      <span className="text-xs font-medium text-white">
                        {artifactTypeLabels[artifact.type]}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      {artifact.durationMs !== null && (
                        <span title="Duration">{formatDuration(artifact.durationMs)}</span>
                      )}
                      {artifact.exitCode !== null && (
                        <span className={artifact.exitCode === 0 ? 'text-green-400' : 'text-red-400'}>
                          exit {artifact.exitCode}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Timestamp */}
                  <p className="text-xs text-gray-500 mb-2">
                    {formatTimestamp(artifact.createdAt)}
                    {artifact.itemId && (
                      <span className="ml-2 text-gray-600">• Item: {artifact.itemId}</span>
                    )}
                  </p>

                  {/* Content preview */}
                  <div className={`
                    rounded bg-gray-900 p-2 border border-gray-700
                    ${artifact.content.length > 300 && !isExpanded ? 'max-h-20 overflow-hidden relative' : ''}
                  `}>
                    {renderArtifactContent(artifact, isExpanded)}

                    {artifact.content.length > 300 && !isExpanded && (
                      <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-gray-900 to-transparent" />
                    )}
                  </div>

                  {/* Expand/collapse button */}
                  {artifact.content.length > 300 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedArtifactId(isExpanded ? null : artifact.id);
                      }}
                      className="mt-2 text-xs text-blue-400 hover:text-blue-300"
                    >
                      {isExpanded ? 'Show less' : 'Show more'}
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