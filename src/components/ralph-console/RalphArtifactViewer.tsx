import { useMemo, useState } from 'react';
import type { ArtifactType, RalphArtifact } from './RalphConsole.types';

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

function getSeverityTone(severity: RalphArtifact['severity']) {
  if (severity === 'error') return 'badge badge-danger';
  if (severity === 'warning') return 'badge badge-warning';
  if (severity === 'info') return 'badge badge-info';
  return 'badge badge-neutral';
}

export function RalphArtifactViewer({
  artifacts,
  selectedArtifact,
  onSelectArtifact,
  maxHeight = 'h-full',
}: RalphArtifactViewerProps) {
  const [filterType, setFilterType] = useState<ArtifactType | 'all'>('all');
  const [expandedArtifactId, setExpandedArtifactId] = useState<string | null>(null);

  const filteredArtifacts = useMemo(() => (
    filterType === 'all' ? artifacts : artifacts.filter(artifact => artifact.type === filterType)
  ), [artifacts, filterType]);

  const uniqueTypes = useMemo(() => Array.from(new Set(artifacts.map(artifact => artifact.type))), [artifacts]);

  const formatTimestamp = (timestamp: number) => (
    new Date(timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  );

  const formatDuration = (ms: number | null) => {
    if (ms === null) return '—';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    return minutes > 0 ? `${minutes}m ${seconds % 60}s` : `${seconds}s`;
  };

  if (filteredArtifacts.length === 0) {
    return (
      <div className={`empty-state ${maxHeight}`}>
        <div>
          <h3 className="text-lg font-semibold">No artifacts available</h3>
          <p className="mt-2 text-sm text-muted">Artifacts will populate after Ralph emits logs, prompts, or validation outputs.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`section-shell ${maxHeight}`}>
      <div className="section-header">
        <div>
          <h2 className="section-title">Artifacts</h2>
          <p className="section-lead">Prompts, outputs, validation results, and generated files emitted by Ralph.</p>
        </div>
        <div className="toolbar-inline">
          <select
            value={filterType}
            onChange={(event) => setFilterType(event.target.value as ArtifactType | 'all')}
            className="select min-w-[180px]"
          >
            <option value="all">All Types</option>
            {uniqueTypes.map(type => (
              <option key={type} value={type}>{artifactTypeLabels[type]}</option>
            ))}
          </select>
          <span className="badge badge-neutral">{filteredArtifacts.length}</span>
        </div>
      </div>

      <div className="list-pane">
        <div className="stack-sm">
          {filteredArtifacts.map(artifact => {
            const isSelected = selectedArtifact?.id === artifact.id;
            const isExpanded = expandedArtifactId === artifact.id;
            const content = isExpanded ? artifact.content : `${artifact.content.slice(0, 280)}${artifact.content.length > 280 ? '…' : ''}`;

            return (
              <div
                key={artifact.id}
                onClick={() => {
                  onSelectArtifact?.(artifact);
                  setExpandedArtifactId(artifact.id);
                }}
                className={`list-card cursor-pointer ${isSelected ? 'selected' : ''}`}
              >
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <h3 className="list-card-title">{artifactTypeLabels[artifact.type]}</h3>
                    <span className={getSeverityTone(artifact.severity)}>{artifact.severity}</span>
                    {artifact.exitCode !== null && (
                      <span className={artifact.exitCode === 0 ? 'badge badge-success' : 'badge badge-danger'}>
                        exit {artifact.exitCode}
                      </span>
                    )}
                  </div>

                  <div className="mb-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted">
                    <span>{formatTimestamp(artifact.createdAt)}</span>
                    <span>{formatDuration(artifact.durationMs)}</span>
                    {artifact.itemId && <span>Item {artifact.itemId}</span>}
                  </div>

                  <div className="code-surface p-3">
                    <pre className={`m-0 whitespace-pre-wrap break-words text-xs text-mono ${artifact.severity === 'error' ? 'text-red-300' : ''}`}>
                      {content}
                    </pre>
                  </div>

                  {artifact.content.length > 280 && (
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        setExpandedArtifactId(isExpanded ? null : artifact.id);
                      }}
                      className="mt-3 text-xs text-blue-400 hover:text-blue-300"
                    >
                      {isExpanded ? 'Show less' : 'Show more'}
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
