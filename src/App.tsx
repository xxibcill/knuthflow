import { useEffect, useState } from 'react';
import { Terminal } from './components/Terminal';
import type { ClaudeCodeStatus, ClaudeRunState } from './preload';

interface ActiveRun {
  runId: string;
  sessionId: string;
  state: ClaudeRunState;
  exitCode?: number;
  signal?: number;
  error?: string;
}

export default function App() {
  const [status, setStatus] = useState<ClaudeCodeStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeRun, setActiveRun] = useState<ActiveRun | null>(null);

  useEffect(() => {
    window.knuthflow.claude.detect().then((result: ClaudeCodeStatus) => {
      setStatus(result);
      setLoading(false);
    });
  }, []);

  // Listen for run state changes
  useEffect(() => {
    const handleRunStateChanged = (data: { runId: string; state: ClaudeRunState; exitCode?: number; signal?: number; error?: string }) => {
      if (activeRun && data.runId === activeRun.runId) {
        setActiveRun(prev => prev ? { ...prev, ...data } : null);
      }
    };

    window.knuthflow.claude.onRunStateChanged(handleRunStateChanged);

    return () => {
      window.knuthflow.claude.removeRunStateListener(handleRunStateChanged);
    };
  }, [activeRun]);

  const handleStartClaude = async () => {
    if (!status?.installed) return;

    const result = await window.knuthflow.claude.launch([]);

    if (!result.success) {
      return;
    }

    if (!result.runId || !result.sessionId) {
      return;
    }

    setActiveRun({
      runId: result.runId,
      sessionId: result.sessionId,
      state: 'starting',
    });
  };

  const handleStopClaude = async () => {
    if (!activeRun) return;

    await window.knuthflow.claude.kill(activeRun.runId);
    setActiveRun(null);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <header className="flex-none bg-gray-800 border-b border-gray-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Knuthflow</h1>
            <p className="text-sm text-gray-400">Desktop wrapper for Claude Code CLI</p>
          </div>
          <div className="flex items-center gap-4">
            {/* Run status indicator */}
            {activeRun && (
              <div className="flex items-center gap-2">
                {activeRun.state === 'starting' && (
                  <>
                    <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></span>
                    <span className="text-yellow-400 text-sm">Starting...</span>
                  </>
                )}
                {activeRun.state === 'running' && (
                  <>
                    <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                    <span className="text-blue-400 text-sm">Running</span>
                  </>
                )}
                {activeRun.state === 'exited' && (
                  <>
                    <span className="w-2 h-2 bg-gray-500 rounded-full"></span>
                    <span className="text-gray-400 text-sm">Exited (0)</span>
                  </>
                )}
                {activeRun.state === 'failed' && (
                  <>
                    <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                    <span className="text-red-400 text-sm">Failed{activeRun.exitCode !== undefined ? ` (${activeRun.exitCode})` : ''}</span>
                  </>
                )}
              </div>
            )}

            {loading ? (
              <span className="text-gray-500 text-sm">Checking...</span>
            ) : status?.installed ? (
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                <span className="text-green-400 text-sm font-medium">
                  Claude Code {status.version || 'installed'}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                <span className="text-red-400 text-sm font-medium">Not installed</span>
              </div>
            )}

            {/* Start/Stop button */}
            {!loading && status?.installed && (
              activeRun && (activeRun.state === 'starting' || activeRun.state === 'running') ? (
                <button
                  onClick={handleStopClaude}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded transition-colors"
                >
                  Stop
                </button>
              ) : (
                <button
                  onClick={handleStartClaude}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded transition-colors"
                >
                  Start Claude Code
                </button>
              )
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-h-0">
        {/* Terminal View */}
        <div className="flex-1 min-h-0">
          <Terminal
            className="h-full"
            sessionId={activeRun?.sessionId}
          />
        </div>

        {/* Status Bar */}
        <footer className="flex-none bg-gray-800 border-t border-gray-700 px-4 py-2">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>
              {status?.installed
                ? `Claude Code: ${status.executablePath}`
                : 'Claude Code not detected'}
            </span>
            <span>
              {activeRun ? (
                activeRun.state === 'running'
                  ? `Run: ${activeRun.runId}`
                  : activeRun.state === 'exited'
                  ? `Exited with code ${activeRun.exitCode}`
                  : activeRun.state === 'failed'
                  ? `Failed: ${activeRun.error || activeRun.exitCode}`
                  : 'Ready'
              ) : 'Ready'}
            </span>
          </div>
        </footer>
      </main>
    </div>
  );
}
