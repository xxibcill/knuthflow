import { useEffect, useState } from 'react';
import { Terminal } from './components/Terminal';

interface ClaudeCodeStatus {
  installed: boolean;
  executablePath: string | null;
  version: string | null;
  error: string | null;
}

export default function App() {
  const [status, setStatus] = useState<ClaudeCodeStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.knuthflow.claude.detect().then((result: ClaudeCodeStatus) => {
      setStatus(result);
      setLoading(false);
    });
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <header className="flex-none bg-gray-800 border-b border-gray-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Knuthflow</h1>
            <p className="text-sm text-gray-400">Desktop wrapper for Claude Code CLI</p>
          </div>
          <div className="flex items-center gap-2">
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
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-h-0">
        {/* Terminal View */}
        <div className="flex-1 min-h-0">
          <Terminal className="h-full" />
        </div>

        {/* Status Bar */}
        <footer className="flex-none bg-gray-800 border-t border-gray-700 px-4 py-2">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>
              {status?.installed
                ? `Claude Code: ${status.executablePath}`
                : 'Claude Code not detected'}
            </span>
            <span>Ready</span>
          </div>
        </footer>
      </main>
    </div>
  );
}
