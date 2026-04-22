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
  preview_screenshot: 'Preview Screenshot',
  visual_smoke_check: 'Visual Smoke Check',
  console_evidence: 'Console Evidence',
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

  const isPreviewScreenshot = (type: ArtifactType) => type === 'preview_screenshot';
  const isVisualSmokeCheck = (type: ArtifactType) => type === 'visual_smoke_check';
  const isConsoleEvidence = (type: ArtifactType) => type === 'console_evidence';

  const renderArtifactContent = (artifact: RalphArtifact, isExpanded: boolean) => {
    const isScreenshot = isPreviewScreenshot(artifact.type);
    const isSmokeCheck = isVisualSmokeCheck(artifact.type);
    const isConsole = isConsoleEvidence(artifact.type);

    if (isScreenshot && artifact.content) {
      // Render screenshot as image
      const imgSrc = `data:image/png;base64,${artifact.content}`;
      return (
        <div className="mt-2">
          <img
            src={imgSrc}
            alt={`Screenshot for ${artifact.metadata.route as string ?? 'preview'}`}
            className="max-w-full rounded border border-[var(--border-subtle)]"
            style={{ maxHeight: isExpanded ? '600px' : '200px' }}
          />
          {typeof artifact.metadata.route === 'string' && (
            <p className="mt-1 text-xs text-muted">
              Route: {artifact.metadata.route as string} | Viewport: {artifact.metadata.viewport as string}
            </p>
          )}
        </div>
      );
    }

    if (isSmokeCheck) {
      // Parse and display smoke check results
      try {
        const result = JSON.parse(artifact.content);
        return (
          <div className="code-surface p-3 mt-2">
            <div className="mb-2">
              <span className={`badge ${result.passed ? 'badge-success' : 'badge-danger'}`}>
                {result.passed ? 'PASSED' : 'FAILED'}
              </span>
              <span className="ml-2 text-sm">{result.summary}</span>
            </div>
            {result.checks && (
              <div className="mt-2 space-y-1">
                {result.checks.map((check: { name: string; passed: boolean; severity: string; description: string }, idx: number) => (
                  <div key={idx} className="flex items-start gap-2 text-xs">
                    <span className={check.passed ? 'text-green-400' : 'text-red-400'}>
                      {check.passed ? '✓' : '✗'}
                    </span>
                    <span>{check.description}</span>
                  </div>
                ))}
              </div>
            )}
            {result.errors && result.errors.length > 0 && (
              <div className="mt-2">
                <p className="text-red-400 text-xs font-semibold">Errors:</p>
                {result.errors.map((err: { code: string; message: string }, idx: number) => (
                  <p key={idx} className="text-xs text-red-300">{err.code}: {err.message}</p>
                ))}
              </div>
            )}
          </div>
        );
      } catch {
        return <pre className="m-0 whitespace-pre-wrap break-words text-xs text-mono">{artifact.content}</pre>;
      }
    }

    if (isConsole) {
      // Parse and display console evidence
      try {
        const evidence = JSON.parse(artifact.content);
        const totalErrors = evidence.reduce((sum: number, e: { consoleErrors: string[]; pageErrors: string[] }) =>
          sum + (e.consoleErrors?.length ?? 0) + (e.pageErrors?.length ?? 0), 0);
        const totalFailedRequests = evidence.reduce((sum: number, e: { failedRequests: unknown[] }) =>
          sum + (e.failedRequests?.length ?? 0), 0);

        return (
          <div className="code-surface p-3 mt-2">
            <div className="mb-2 flex flex-wrap gap-2">
              <span className={`badge ${totalErrors > 0 ? 'badge-danger' : 'badge-success'}`}>
                {totalErrors} errors
              </span>
              <span className={`badge ${totalFailedRequests > 0 ? 'badge-warning' : 'badge-success'}`}>
                {totalFailedRequests} failed requests
              </span>
            </div>
            {evidence.map((ev: { route: string; viewport: string; consoleErrors: string[]; pageErrors: string[] }, idx: number) => (
              <div key={idx} className="mt-2 border-t border-[var(--border-subtle)] pt-2">
                <p className="text-xs font-semibold">{ev.route} ({ev.viewport})</p>
                {ev.consoleErrors?.length > 0 && (
                  <div className="mt-1">
                    <p className="text-xs text-red-400">Console Errors:</p>
                    {ev.consoleErrors.slice(0, 3).map((err: string, i: number) => (
                      <p key={i} className="text-xs text-red-300 truncate">{err}</p>
                    ))}
                  </div>
                )}
                {ev.pageErrors?.length > 0 && (
                  <div className="mt-1">
                    <p className="text-xs text-red-400">Page Errors:</p>
                    {ev.pageErrors.slice(0, 3).map((err: string, i: number) => (
                      <p key={i} className="text-xs text-red-300 truncate">{err}</p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        );
      } catch {
        return <pre className="m-0 whitespace-pre-wrap break-words text-xs text-mono">{artifact.content}</pre>;
      }
    }

    // Default text content
    const content = isExpanded ? artifact.content : `${artifact.content.slice(0, 280)}${artifact.content.length > 280 ? '…' : ''}`;
    return (
      <pre className={`m-0 whitespace-pre-wrap break-words text-xs text-mono ${artifact.severity === 'error' ? 'text-red-300' : ''}`}>
        {content}
      </pre>
    );
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
                    {typeof artifact.metadata.route === 'string' && (
                      <span>{artifact.metadata.route as string}</span>
                    )}
                  </div>

                  <div className="code-surface p-3">
                    {renderArtifactContent(artifact, isExpanded)}
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
