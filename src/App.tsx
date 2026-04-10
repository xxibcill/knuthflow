import { useEffect, useState, useCallback } from 'react';
import { Terminal } from './components/Terminal';
import { WorkspaceSelector } from './components/WorkspaceSelector';
import { SessionHistory } from './components/SessionHistory';
import { SettingsPanel } from './components/SettingsPanel';
import type { ClaudeCodeStatus, ClaudeRunState, Workspace, Session, SessionCrashedEvent, RecoveryNeededEvent, UpdateInfo } from './preload';

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
  crashed?: boolean;
  crashMessage?: string;
}

interface Notification {
  id: string;
  type: 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: number;
}

export default function App() {
  const [status, setStatus] = useState<ClaudeCodeStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeRun, setActiveRun] = useState<ActiveRun | null>(null);
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('workspaces');
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [appVersion, setAppVersion] = useState<string>('');
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  // Add a notification
  const addNotification = useCallback((type: Notification['type'], title: string, message: string) => {
    const id = `notif-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    setNotifications(prev => [...prev, { id, type, title, message, timestamp: Date.now() }]);
    // Auto-dismiss after 8 seconds for errors, 5 seconds for others
    const timeout = type === 'error' ? 8000 : 5000;
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, timeout);
  }, []);

  // Dismiss a notification
  const dismissNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

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

    // Get app version and check for updates
    window.knuthflow.update.getVersion().then(version => {
      setAppVersion(version);
    });

    window.knuthflow.update.check().then(update => {
      if (update.available) {
        setUpdateInfo(update);
        addNotification('info', 'Update Available', `Version ${update.version} is available. Click to download.`);
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
        const isFailure = exitCode !== 0 || signal !== undefined;

        // Update session in database
        await window.knuthflow.session.updateEnd(
          tab.id,
          exitCode === 0 ? 'completed' : 'failed',
          exitCode,
          signal ?? null
        );

        // If crashed, mark the tab and show notification
        if (isFailure) {
          // Get explanation for the exit
          const explanation = await window.knuthflow.supervisor.explainExit(exitCode, signal ?? undefined);

          // Update tab to show crash state
          setTabs(prev => prev.map(t =>
            t.id === tab.id
              ? { ...t, crashed: true, crashMessage: explanation }
              : t
          ));

          // Add notification
          addNotification('error', 'Session Crashed', explanation);
        }
      }
    });

    return () => {
      unsubscribePtyExit();
    };
  }, [tabs, addNotification]);

  // Listen for supervisor crash events
  useEffect(() => {
    const unsubscribeCrash = window.knuthflow.supervisor.onSessionCrashed(async (data: SessionCrashedEvent) => {
      const explanation = await window.knuthflow.supervisor.explainExit(data.exitCode, data.signal ?? undefined);

      // Find and update any tab associated with this session
      setTabs(prev => prev.map(t => {
        if (t.sessionId === data.ptySessionId) {
          return { ...t, crashed: true, crashMessage: explanation };
        }
        return t;
      }));

      addNotification('error', 'Session Crashed', explanation);
    });

    const unsubscribeRecovery = window.knuthflow.supervisor.onRecoveryNeeded((data: RecoveryNeededEvent) => {
      if (data.type === 'notify') {
        addNotification('warning', 'Recovery Information', data.reason);
      }
    });

    const unsubscribeOrphan = window.knuthflow.supervisor.onOrphanCleaned(({ sessionId }) => {
      console.log(`[App] Orphaned session cleaned: ${sessionId}`);
    });

    return () => {
      unsubscribeCrash();
      unsubscribeRecovery();
      unsubscribeOrphan();
    };
  }, [addNotification]);

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

            {/* App version and update button */}
            <div className="flex items-center gap-2">
              {appVersion && (
                <span className="text-gray-500 text-xs">v{appVersion}</span>
              )}
              {updateInfo?.available && updateInfo.downloadUrl && (
                <button
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
                    : tab.crashed
                    ? 'bg-gray-700 hover:bg-gray-600 text-red-300'
                    : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                }`}
              >
                {tab.crashed ? (
                  <span className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0" title="Session crashed" />
                ) : (
                  <span className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0" />
                )}
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

      {/* Notification toasts */}
      {notifications.length > 0 && (
        <div className="fixed top-16 right-4 z-50 flex flex-col gap-2 max-w-sm">
          {notifications.map(notif => (
            <div
              key={notif.id}
              className={`flex items-start gap-3 px-4 py-3 rounded-lg shadow-lg ${
                notif.type === 'error'
                  ? 'bg-red-900 border border-red-700'
                  : notif.type === 'warning'
                  ? 'bg-yellow-900 border border-yellow-700'
                  : 'bg-blue-900 border border-blue-700'
              }`}
            >
              <div className="flex-shrink-0 mt-0.5">
                {notif.type === 'error' && (
                  <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                {notif.type === 'warning' && (
                  <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                )}
                {notif.type === 'info' && (
                  <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${
                  notif.type === 'error' ? 'text-red-200' : notif.type === 'warning' ? 'text-yellow-200' : 'text-blue-200'
                }`}>
                  {notif.title}
                </p>
                <p className={`text-xs mt-1 ${
                  notif.type === 'error' ? 'text-red-300' : notif.type === 'warning' ? 'text-yellow-300' : 'text-blue-300'
                }`}>
                  {notif.message}
                </p>
              </div>
              <button
                onClick={() => dismissNotification(notif.id)}
                className="flex-shrink-0 p-1 hover:opacity-70"
              >
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
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
              {/* Crash message bar */}
              {activeTab?.crashed && activeTab.crashMessage && (
                <div className="flex items-center justify-between mt-1 px-2 py-1 bg-red-900 rounded text-xs">
                  <span className="text-red-300">
                    <span className="font-medium">Session crashed:</span> {activeTab.crashMessage}
                  </span>
                  <button
                    onClick={() => {
                      // Close crashed tab and switch to workspaces
                      handleCloseTab(activeTab.id);
                    }}
                    className="text-red-400 hover:text-red-200 underline ml-2"
                  >
                    Dismiss
                  </button>
                </div>
              )}
            </footer>
          </>
        )}
      </main>

      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
    </div>
  );
}
