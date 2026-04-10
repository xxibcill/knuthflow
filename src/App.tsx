import { useEffect, useState } from 'react';

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
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Knuthflow</h1>
        <p className="text-gray-400 mb-8">Desktop wrapper for Claude Code CLI</p>

        {loading ? (
          <p className="text-gray-500">Checking Claude Code installation...</p>
        ) : status?.installed ? (
          <div className="bg-gray-800 rounded-lg p-6 text-left max-w-md mx-auto">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-3 h-3 bg-green-500 rounded-full"></span>
              <span className="text-green-400 font-medium">Claude Code Installed</span>
            </div>
            {status.version && (
              <p className="text-gray-300 mb-2">
                <span className="text-gray-500">Version:</span> {status.version}
              </p>
            )}
            {status.executablePath && (
              <p className="text-gray-300 text-sm break-all">
                <span className="text-gray-500">Path:</span> {status.executablePath}
              </p>
            )}
          </div>
        ) : (
          <div className="bg-gray-800 rounded-lg p-6 text-left max-w-md mx-auto">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-3 h-3 bg-red-500 rounded-full"></span>
              <span className="text-red-400 font-medium">Claude Code Not Found</span>
            </div>
            <p className="text-gray-400 text-sm">
              {status?.error || 'Please install Claude Code to use Knuthflow.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
