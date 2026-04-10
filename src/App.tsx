import { useEffect, useState } from 'react';
import { Terminal } from './components/Terminal';
import { WorkspaceSelector } from './components/WorkspaceSelector';
import { SessionHistory } from './components/SessionHistory';
import { SettingsPanel } from './components/SettingsPanel';
import type { ClaudeCodeStatus, ClaudeRunState, Workspace, Session } from './preload';

type ViewMode = 'terminal' | 'workspaces' | 'history';

interface ActiveRun {
  runId: string;
  sessionId: string;
  state: ClaudeRunState;
  exitCode?: number;
  signal?: number;
  error?: string;
}

interface Tab {
  id: string;
  name: string;
  sessionId: string | null;
  runId: string | null;
  workspaceId: string | null;
}

export default function App() {
  const [status, setStatus] = useState<ClaudeCodeStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeRun, setActiveRun] = useState<ActiveRun | null>(null);
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('workspaces');
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    window.knuthflow.claude.detect().then((result: ClaudeCodeStatus) => {
      setStatus(result);
      setLoading(false);
    });

    // Check for existing active sessions
    window.knuthflow.session.listActive().then(activeSessions => {
      if (activeSessions.length > 0) {
        // Restore active sessions as tabs
        const restoredTabs: Tab[] = activeSessions.map(session => ({
          id: session.id,
          name: session.name,
          sessionId: session.ptySessionId,
          runId: session.runId,
          workspaceId: session.workspaceId,
        }));
        setTabs(restoredTabs);
        if (restoredTabs.length > 0) {
          setActiveTabId(restoredTabs[0].id);
          setViewMode('terminal');
        }
      }
    });
  }, []);

  // Listen for run state changes
  useEffect(() => {
    const handleRunStateChanged = (data: { runId: string; state: ClaudeRunState; exitCode?: number; signal?: number; error?: string }) => {
      if (activeRun && data.runId === activeRun.runId) {
        setActiveRun(prev => prev ? { ...prev, ...data } : null);
      }
    };

    const unsubscribe = window.knuthflow.claude.onRunStateChanged(handleRunStateChanged);

    return () => {
      unsubscribe();
    };
  }, [activeRun]);

  // Listen for PTY exit events to update session status
  useEffect(() => {
    const unsubscribePtyExit = window.knuthflow.pty.onExit(async ({ sessionId, exitCode, signal }) => {
      // Find the tab with this pty session
      const tab = tabs.find(t => t.sessionId === sessionId);
      if (tab) {
        await window.knuthflow.session.updateEnd(
          tab.id,
          exitCode === 0 ? 'completed' : 'failed',
          exitCode,
          signal ?? null
        );
      }
    });

    return () => {
      unsubscribePtyExit();
    };
  }, [tabs]);

  const handleWorkspaceSelect = async (workspace: Workspace) => {
    setSelectedWorkspace(workspace);
    await window.knuthflow.workspace.updateLastOpened(workspace.id);
    setViewMode('terminal');
  };

  const handleStartClaude = async () => {
    if (!status?.installed) return;

    const sessionName = `Session ${new Date().toLocaleTimeString()}`;
    const result = await window.knuthflow.claude.launch([]);

    if (!result.success) {
      return;
    }

    if (!result.runId || !result.sessionId) {
      return;
    }

    // Create a new tab for this session
    const newTab: Tab = {
      id: result.sessionId,
      name: sessionName,
      sessionId: result.sessionId,
      runId: result.runId,
      workspaceId: selectedWorkspace?.id || null,
    };
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newTab.id);

    setActiveRun({
      runId: result.runId,
      sessionId: result.sessionId,
      state: 'starting',
    });

    // Create session in database
    await window.knuthflow.session.create(
      sessionName,
      selectedWorkspace?.id || null,
      result.runId,
      result.sessionId
    );

    setViewMode('terminal');
  };

  const handleStopClaude = async () => {
    if (!activeRun) return;

    await window.knuthflow.claude.kill(activeRun.runId);
    setActiveRun(null);
  };

  const handleCloseTab = async (tabId: string) => {
    const tab = tabs.find(t => t.id === tabId);
    if (tab?.runId) {
      await window.knuthflow.claude.kill(tab.runId);
    }

    setTabs(prev => {
      const remainingTabs = prev.filter(t => t.id !== tabId);
      // If we closed the active tab, switch to another
      if (activeTabId === tabId && remainingTabs.length > 0) {
        // Schedule the tab switch after the state update
        setTimeout(() => setActiveTabId(remainingTabs[0].id), 0);
      } else if (remainingTabs.length === 0) {
        setViewMode('workspaces');
        setActiveRun(null);
      }
      return remainingTabs;
    });
  };

  const handleRestoreSession = (session: Session) => {
    // Session restoration is not yet implemented
    // For now, just log the request - completed/failed sessions cannot be restored
    if (session.status === 'active') {
      console.log('Session is already active:', session);
    } else {
      console.log('Session restoration requested for completed/failed session:', session);
    }
  };

  const activeTab = tabs.find(t => t.id === activeTabId);
  const activeSessionId = activeTab?.sessionId || activeRun?.sessionId || null;

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Header */}
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
              <button
                onClick={() => setViewMode('terminal')}
                className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                  viewMode === 'terminal'
                    ? 'bg-gray-600 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Terminal
              </button>
              <button
                onClick={() => setViewMode('workspaces')}
                className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                  viewMode === 'workspaces'
                    ? 'bg-gray-600 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Workspaces
              </button>
              <button
                onClick={() => setViewMode('history')}
                className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                  viewMode === 'history'
                    ? 'bg-gray-600 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                History
              </button>
            </div>

            {/* Run status indicator */}
            {activeRun && viewMode === 'terminal' && (
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

            {/* Settings button */}
            <button
              onClick={() => setShowSettings(true)}
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
                  New Session
                </button>
              )
            )}
          </div>
        </div>
      </header>

      {/* Tab bar */}
      {tabs.length > 0 && viewMode === 'terminal' && (
        <div className="flex-none bg-gray-800 border-b border-gray-700 px-2">
          <div className="flex items-center gap-1 overflow-x-auto">
            {tabs.map(tab => (
              <div
                key={tab.id}
                onClick={() => setActiveTabId(tab.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-t cursor-pointer transition-colors min-w-0 ${
                  activeTabId === tab.id
                    ? 'bg-gray-900 text-white border-b-2 border-blue-500'
                    : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                }`}
              >
                <span className="truncate text-sm">{tab.name}</span>
                <button
                  onClick={e => {
                    e.stopPropagation();
                    handleCloseTab(tab.id);
                  }}
                  className="p-0.5 hover:text-red-400 flex-shrink-0"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 flex flex-col min-h-0">
        {viewMode === 'workspaces' && (
          <div className="flex-1 min-h-0">
            <WorkspaceSelector
              onSelect={handleWorkspaceSelect}
              selectedWorkspace={selectedWorkspace}
            />
          </div>
        )}

        {viewMode === 'history' && (
          <div className="flex-1 min-h-0">
            <SessionHistory
              onRestore={handleRestoreSession}
              currentWorkspaceId={selectedWorkspace?.id || null}
            />
          </div>
        )}

        {viewMode === 'terminal' && (
          <>
            {/* Terminal View */}
            <div className="flex-1 min-h-0">
              <Terminal
                className="h-full"
                sessionId={activeSessionId}
              />
            </div>

            {/* Status Bar */}
            <footer className="flex-none bg-gray-800 border-t border-gray-700 px-4 py-2">
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>
                  {selectedWorkspace
                    ? `Workspace: ${selectedWorkspace.path}`
                    : status?.installed
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
          </>
        )}
      </main>

      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
    </div>
  );
}
