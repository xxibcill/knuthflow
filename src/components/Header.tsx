import type { ClaudeCodeStatus, UpdateInfo } from '../shared/preloadTypes';
import type { ActiveRun } from '../hooks/useActiveRun';

export type ViewMode = 'terminal' | 'workspaces' | 'history' | 'editor';

interface HeaderProps {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  status: ClaudeCodeStatus | null;
  loading: boolean;
  appVersion: string;
  updateInfo: UpdateInfo | null;
  activeRun: ActiveRun | null;
  selectedWorkspace: { name: string } | null;
  onOpenFile: () => void;
  onOpenSettings: () => void;
  onStartClaude: () => void;
  onStopClaude: () => void;
}

export function Header({
  viewMode,
  setViewMode,
  status,
  loading,
  appVersion,
  updateInfo,
  activeRun,
  selectedWorkspace,
  onOpenFile,
  onOpenSettings,
  onStartClaude,
  onStopClaude,
}: HeaderProps) {
  return (
    <header className="flex-none bg-gray-800 border-b border-gray-700 px-4 py-3">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Knuthflow</h1>
          {selectedWorkspace && viewMode === 'terminal' && (
            <p className="text-sm text-gray-400">{selectedWorkspace.name}</p>
          )}
        </div>
        <div className="flex items-center gap-4">
          {/* View mode switcher */}
          <div className="flex items-center gap-1 bg-gray-700 rounded-lg p-1">
            {(['terminal', 'workspaces', 'history', 'editor'] as ViewMode[]).map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                  viewMode === mode
                    ? 'bg-gray-600 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>

          {/* Quick file open button */}
          <button
            onClick={onOpenFile}
            className="p-2 text-gray-400 hover:text-white transition-colors"
            title="Open File"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </button>

          {/* Run status indicator */}
          <StatusIndicator activeRun={activeRun} viewMode={viewMode} />

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

          {/* App version and update button */}
          <div className="flex items-center gap-2">
            {appVersion && (
              <span className="text-gray-500 text-xs">v{appVersion}</span>
            )}
            {updateInfo?.available && updateInfo.downloadUrl && (
              <button
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                onClick={() => window.knuthflow.update.openDownload(updateInfo.downloadUrl!)}
                className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded transition-colors flex items-center gap-1"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Update to {updateInfo.version}
              </button>
            )}
          </div>

          {/* Settings button */}
          <button
            onClick={onOpenSettings}
            className="p-2 text-gray-400 hover:text-white transition-colors"
            title="Settings"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>

          {/* Start/Stop button */}
          {!loading && status?.installed && viewMode === 'terminal' && (
            activeRun && (activeRun.state === 'starting' || activeRun.state === 'running') ? (
              <button
                onClick={onStopClaude}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded transition-colors"
              >
                Stop
              </button>
            ) : (
              <button
                onClick={onStartClaude}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded transition-colors"
              >
                New Session
              </button>
            )
          )}
        </div>
      </div>
    </header>
  );
}

interface StatusIndicatorProps {
  activeRun: ActiveRun | null;
  viewMode: ViewMode;
}

export function StatusIndicator({ activeRun, viewMode }: StatusIndicatorProps) {
  if (!activeRun || viewMode !== 'terminal') {
    return null;
  }

  return (
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
  );
}
