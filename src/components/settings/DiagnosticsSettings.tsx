import { useEffect, useState } from 'react';
import type { LogEntry, SystemDiagnostics } from '../../shared/preloadTypes';

interface DiagnosticsSettingsProps {
  diagnostics: SystemDiagnostics | null;
}

export function DiagnosticsSettings({ diagnostics }: DiagnosticsSettingsProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    const logEntries = await window.knuthflow.logs.get(100);
    setLogs(logEntries);
  };

  const handleExportLogs = async () => {
    const exported = await window.knuthflow.logs.export('text');
    const blob = new Blob([exported], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `knuthflow-logs-${Date.now()}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="stack-lg">
      {diagnostics && (
        <section className="metrics-grid">
          <div className="metric-card">
            <p className="metric-label">App Version</p>
            <p className="metric-value">{diagnostics.app.version}</p>
            <p className="mt-2 text-sm text-muted">Electron {diagnostics.app.electronVersion} • Node {diagnostics.app.nodeVersion}</p>
          </div>
          <div className="metric-card">
            <p className="metric-label">Platform</p>
            <p className="metric-value">{diagnostics.app.platform}</p>
            <p className="mt-2 text-sm text-muted">Architecture {diagnostics.app.arch}</p>
          </div>
          <div className="metric-card">
            <p className="metric-label">Claude Code</p>
            <p className="metric-value">{diagnostics.claude.installed ? 'Detected' : 'Missing'}</p>
            <p className="mt-2 text-sm text-muted">{diagnostics.claude.version || diagnostics.claude.error || 'No version available'}</p>
          </div>
          <div className="metric-card">
            <p className="metric-label">Secure Storage</p>
            <p className="metric-value">{diagnostics.storage.backend}</p>
            <p className="mt-2 text-sm text-muted">
              {diagnostics.storage.usingFallback ? 'Fallback backend in use' : 'Primary secure backend active'}
            </p>
          </div>
        </section>
      )}

      {diagnostics && (
        <section className="surface-panel-muted p-5">
          <div className="toolbar-inline justify-between">
            <div>
              <p className="metric-label">Detected Paths</p>
              <p className="m-0 text-sm text-muted">Filesystem references used by the current installation.</p>
            </div>
            <button onClick={handleExportLogs} className="btn">Export Logs</button>
          </div>

          <div className="mt-5 stack-sm text-sm">
            {diagnostics.claude.path && (
              <div className="surface-panel-inset px-4 py-3 text-mono text-xs">
                Claude: {diagnostics.claude.path}
              </div>
            )}
            {diagnostics.logFiles.length > 0 && diagnostics.logFiles.slice(0, 5).map((filePath, index) => (
              <div key={`${filePath}-${index}`} className="surface-panel-inset px-4 py-3 text-mono text-xs">
                Log: {filePath}
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="surface-panel-muted p-5">
        <div className="toolbar-inline justify-between">
          <div>
            <p className="metric-label">Recent Logs</p>
            <p className="m-0 text-sm text-muted">Latest renderer and main-process events.</p>
          </div>
          <span className="badge badge-neutral">{logs.length} entries</span>
        </div>

        <div className="mt-5 code-surface max-h-[420px] overflow-auto p-4">
          {logs.length > 0 ? (
            <div className="stack-sm text-mono text-xs">
              {logs.slice(0, 50).map((log, index) => (
                <div key={`${log.timestamp}-${index}`} className="flex flex-wrap gap-x-3 gap-y-1">
                  <span className="text-dim">{new Date(log.timestamp).toLocaleTimeString()}</span>
                  <span className={log.level === 'error' ? 'text-red-400' : log.level === 'warn' ? 'text-yellow-400' : log.level === 'info' ? 'text-blue-400' : 'text-muted'}>
                    [{log.level}]
                  </span>
                  <span className="text-dim">[{log.category}]</span>
                  <span>{log.message}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="m-0 text-sm text-muted">No logs available.</p>
          )}
        </div>
      </section>
    </div>
  );
}
