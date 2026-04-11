import { useState, useEffect } from 'react';
import type { SystemDiagnostics, LogEntry } from '../../shared/preloadTypes';

interface DiagnosticsSettingsProps {
  diagnostics: SystemDiagnostics | null;
}

export function DiagnosticsSettings({ diagnostics }: DiagnosticsSettingsProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    const logsData = await window.knuthflow.logs.get(100);
    setLogs(logsData);
  };

  const handleExportLogs = async () => {
    const exported = await window.knuthflow.logs.export('text');
    const blob = new Blob([exported], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `knuthflow-logs-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium text-gray-300 mb-3">System Info</h3>
        {diagnostics && (
          <div className="bg-gray-700 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-400">App Version:</span>
                <span className="text-white ml-2">{diagnostics.app.version}</span>
              </div>
              <div>
                <span className="text-gray-400">Platform:</span>
                <span className="text-white ml-2">{diagnostics.app.platform} ({diagnostics.app.arch})</span>
              </div>
              <div>
                <span className="text-gray-400">Electron:</span>
                <span className="text-white ml-2">{diagnostics.app.electronVersion}</span>
              </div>
              <div>
                <span className="text-gray-400">Node:</span>
                <span className="text-white ml-2">{diagnostics.app.nodeVersion}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div>
        <h3 className="text-sm font-medium text-gray-300 mb-3">Claude Code Status</h3>
        {diagnostics && (
          <div className="bg-gray-700 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className={`w-3 h-3 rounded-full ${diagnostics.claude.installed ? 'bg-green-500' : 'bg-red-500'}`}></span>
              <span className="text-white">{diagnostics.claude.installed ? 'Installed' : 'Not Found'}</span>
            </div>
            {diagnostics.claude.path && (
              <p className="text-xs text-gray-400 mb-1">Path: {diagnostics.claude.path}</p>
            )}
            {diagnostics.claude.version && (
              <p className="text-xs text-gray-400">Version: {diagnostics.claude.version}</p>
            )}
            {diagnostics.claude.error && (
              <p className="text-xs text-red-400 mt-1">{diagnostics.claude.error}</p>
            )}
          </div>
        )}
      </div>

      <div>
        <h3 className="text-sm font-medium text-gray-300 mb-3">Storage</h3>
        {diagnostics && (
          <div className="bg-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-300">Secure Storage Backend</span>
              <span className="px-2 py-1 bg-blue-600 text-white text-xs rounded">
                {diagnostics.storage.backend}
                {diagnostics.storage.usingFallback && ' (Fallback)'}
              </span>
            </div>
          </div>
        )}
      </div>

      <div>
        <h3 className="text-sm font-medium text-gray-300 mb-3">Log Files</h3>
        {diagnostics && (
          <div className="bg-gray-700 rounded-lg p-4">
            {diagnostics.logFiles.length > 0 ? (
              <div className="space-y-1">
                {diagnostics.logFiles.slice(0, 5).map((filePath, i) => {
                  const fileName = filePath.split(/[/\\]/).pop() || filePath;
                  return (
                    <div key={i} className="text-xs text-gray-400 font-mono">{fileName}</div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-400">No log files found</p>
            )}
          </div>
        )}
      </div>

      <div>
        <h3 className="text-sm font-medium text-gray-300 mb-3">Recent Logs</h3>
        <div className="bg-gray-700 rounded-lg p-4 max-h-64 overflow-y-auto">
          {logs.length > 0 ? (
            <div className="space-y-1 font-mono text-xs">
              {logs.slice(0, 50).map((log, i) => (
                <div key={i} className="flex gap-2">
                  <span className="text-gray-500">{new Date(log.timestamp).toLocaleTimeString()}</span>
                  <span className={`uppercase ${
                    log.level === 'error' ? 'text-red-400' :
                    log.level === 'warn' ? 'text-yellow-400' :
                    log.level === 'info' ? 'text-blue-400' : 'text-gray-400'
                  }`}>[{log.level}]</span>
                  <span className="text-gray-400">[{log.category}]</span>
                  <span className="text-white">{log.message}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">No logs available</p>
          )}
        </div>
      </div>

      <button
        onClick={handleExportLogs}
        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded transition-colors"
      >
        Export Logs
      </button>
    </div>
  );
}
