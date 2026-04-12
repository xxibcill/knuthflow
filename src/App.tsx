import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react'
import { Terminal } from './components/Terminal'
import { WorkspaceSelector } from './components/WorkspaceSelector'
import { SessionHistory } from './components/SessionHistory'
import { SettingsPanel } from './components/SettingsPanel'
import { EditorPane } from './components/EditorPane'
import { DiffViewer, type DiffFile } from './components/DiffViewer'
import { SplitPane } from './components/SplitPane'
import { RalphConsolePanel } from './components/ralph-console/RalphConsolePanel'
import { NotificationToast } from './components/NotificationToast'
import type {
  ClaudeCodeStatus,
  ClaudeRunState,
  Workspace,
  Session,
  SessionCrashedEvent,
  RecoveryNeededEvent,
  UpdateInfo,
} from './preload'
import type { AppSettings } from './shared/preloadTypes'

type ViewMode = 'terminal' | 'workspaces' | 'history' | 'editor' | 'console'

interface ActiveRun {
  runId: string
  sessionId: string
  state: ClaudeRunState
  exitCode?: number
  signal?: number
  error?: string
}

interface Tab {
  id: string
  name: string
  sessionId: string | null
  runId: string | null
  workspaceId: string | null
  crashed?: boolean
  crashMessage?: string
}

interface Notification {
  id: string
  type: 'error' | 'warning' | 'info'
  title: string
  message: string
  timestamp: number
}

interface LaunchSessionOptions {
  name: string
  args?: string[]
  workspace: Workspace | null
  switchToTerminal?: boolean
}

interface LaunchSessionResult {
  success: boolean
  claudeRunId?: string
  ptySessionId?: string
  sessionRecordId?: string
  error?: string
}

const VIEW_LABELS: Record<ViewMode, string> = {
  terminal: 'Terminal',
  workspaces: 'Workspaces',
  history: 'History',
  editor: 'Editor',
  console: 'Console',
}

const DEFAULT_SETTINGS: AppSettings = {
  cliPath: null,
  defaultArgs: [],
  launchOnStartup: false,
  restoreLastWorkspace: false,
  defaultWorkspaceId: null,
  confirmBeforeExit: true,
  confirmBeforeKill: true,
  autoSaveSessions: true,
  fontSize: 14,
  fontFamily: 'IBM Plex Mono, SFMono-Regular, Consolas, monospace',
  cursorStyle: 'block',
  showTabBar: true,
  showStatusBar: true,
  theme: 'dark',
}

function resolveTheme(theme: AppSettings['theme'], systemTheme: 'light' | 'dark') {
  return theme === 'system' ? systemTheme : theme
}

function getRunSummary(activeRun: ActiveRun | null) {
  if (!activeRun) return 'Ready'

  if (activeRun.state === 'running') {
    return `Run ${activeRun.runId.slice(0, 8)} active`
  }

  if (activeRun.state === 'starting') {
    return 'Session booting'
  }

  if (activeRun.state === 'exited') {
    return `Exited with code ${activeRun.exitCode ?? 0}`
  }

  if (activeRun.state === 'failed') {
    return `Failed: ${activeRun.error || activeRun.exitCode || 'Unknown error'}`
  }

  return 'Ready'
}

function getRunBadge(activeRun: ActiveRun | null): { label: string; className: string } {
  if (!activeRun) {
    return { label: 'Idle', className: 'badge-neutral' }
  }

  if (activeRun.state === 'running') {
    return { label: 'Running', className: 'badge-info' }
  }

  if (activeRun.state === 'starting') {
    return { label: 'Starting', className: 'badge-warning' }
  }

  if (activeRun.state === 'failed') {
    return { label: 'Failed', className: 'badge-danger' }
  }

  return { label: 'Exited', className: 'badge-neutral' }
}

export default function App() {
  const [status, setStatus] = useState<ClaudeCodeStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeRun, setActiveRun] = useState<ActiveRun | null>(null)
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('workspaces')
  const [tabs, setTabs] = useState<Tab[]>([])
  const [activeTabId, setActiveTabId] = useState<string | null>(null)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>('dark')

  const [editorFilePath, setEditorFilePath] = useState<string | null>(null)
  const [diffFiles, setDiffFiles] = useState<DiffFile[]>([])
  const [showDiffViewer, setShowDiffViewer] = useState(false)

  const addNotification = useCallback(
    (type: Notification['type'], title: string, message: string) => {
      const id = `notif-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
      setNotifications((prev) => [...prev, { id, type, title, message, timestamp: Date.now() }])
      const timeout = type === 'error' ? 8000 : 5000
      setTimeout(() => {
        setNotifications((prev) => prev.filter((notification) => notification.id !== id))
      }, timeout)
    },
    [],
  )

  const dismissNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((notification) => notification.id !== id))
  }, [])

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: light)')
    const applySystemTheme = () => setSystemTheme(mediaQuery.matches ? 'light' : 'dark')
    applySystemTheme()
    mediaQuery.addEventListener('change', applySystemTheme)
    return () => mediaQuery.removeEventListener('change', applySystemTheme)
  }, [])

  useEffect(() => {
    let mounted = true

    const boot = async () => {
      try {
        const [claudeStatus, activeSessions, update, appSettings] = await Promise.all([
          window.knuthflow.claude.detect(),
          window.knuthflow.session.listActive(),
          window.knuthflow.update.check(),
          window.knuthflow.settings.getAll().catch(() => DEFAULT_SETTINGS),
        ])

        if (!mounted) return

        setStatus(claudeStatus)
        setSettings(appSettings)

        if (update.available) {
          setUpdateInfo(update)
          addNotification('info', 'Update Available', `Version ${update.version} is available.`)
        }

        if (activeSessions.length > 0) {
          const restoredTabs: Tab[] = activeSessions.map((session) => ({
            id: session.id,
            name: session.name,
            sessionId: session.ptySessionId,
            runId: session.runId,
            workspaceId: session.workspaceId,
          }))
          setTabs(restoredTabs)
          setActiveTabId(restoredTabs[0]?.id ?? null)
          setViewMode('terminal')
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    boot()

    return () => {
      mounted = false
    }
  }, [addNotification])

  useEffect(() => {
    const handleRunStateChanged = (data: {
      runId: string
      state: ClaudeRunState
      exitCode?: number
      signal?: number
      error?: string
    }) => {
      if (activeRun && data.runId === activeRun.runId) {
        setActiveRun((prev) => (prev ? { ...prev, ...data } : null))
      }
    }

    const unsubscribe = window.knuthflow.claude.onRunStateChanged(handleRunStateChanged)
    return () => unsubscribe()
  }, [activeRun])

  useEffect(() => {
    const unsubscribePtyExit = window.knuthflow.pty.onExit(
      async ({ sessionId, exitCode, signal }) => {
        const tab = tabs.find((item) => item.sessionId === sessionId)
        if (!tab) return

        const isFailure = exitCode !== 0 || signal !== undefined

        await window.knuthflow.session.updateEnd(
          tab.id,
          exitCode === 0 ? 'completed' : 'failed',
          exitCode,
          signal ?? null,
        )

        if (isFailure) {
          const explanation = await window.knuthflow.supervisor.explainExit(
            exitCode,
            signal ?? undefined,
          )

          setTabs((prev) =>
            prev.map((item) =>
              item.id === tab.id ? { ...item, crashed: true, crashMessage: explanation } : item,
            ),
          )

          addNotification('error', 'Session Crashed', explanation)
        }
      },
    )

    return () => unsubscribePtyExit()
  }, [tabs, addNotification])

  useEffect(() => {
    const unsubscribeCrash = window.knuthflow.supervisor.onSessionCrashed(
      async (data: SessionCrashedEvent) => {
        const explanation = await window.knuthflow.supervisor.explainExit(
          data.exitCode,
          data.signal ?? undefined,
        )

        setTabs((prev) =>
          prev.map((item) =>
            item.sessionId === data.ptySessionId
              ? { ...item, crashed: true, crashMessage: explanation }
              : item,
          ),
        )

        addNotification('error', 'Session Crashed', explanation)
      },
    )

    const unsubscribeRecovery = window.knuthflow.supervisor.onRecoveryNeeded(
      (data: RecoveryNeededEvent) => {
        if (data.type === 'notify') {
          addNotification('warning', 'Recovery Information', data.reason)
        }
      },
    )

    const unsubscribeOrphan = window.knuthflow.supervisor.onOrphanCleaned(({ sessionId }) => {
      console.log(`[App] Orphaned session cleaned: ${sessionId}`)
    })

    return () => {
      unsubscribeCrash()
      unsubscribeRecovery()
      unsubscribeOrphan()
    }
  }, [addNotification])

  const handleWorkspaceSelect = async (workspace: Workspace) => {
    setSelectedWorkspace(workspace)
    await window.knuthflow.workspace.updateLastOpened(workspace.id)
    setViewMode('terminal')
  }

  const launchClaudeSession = useCallback(
    async ({
      name,
      args = [],
      workspace,
      switchToTerminal = true,
    }: LaunchSessionOptions): Promise<LaunchSessionResult> => {
      const result = await window.knuthflow.claude.launch({
        args,
        cwd: workspace?.path,
      })

      if (!result.success || !result.runId || !result.sessionId) {
        return {
          success: false,
          error: result.error || 'Failed to launch Claude session',
        }
      }

      const savedSession = await window.knuthflow.session.create(
        name,
        workspace?.id || null,
        result.runId,
        result.sessionId,
      )

      const newTab: Tab = {
        id: savedSession.id,
        name,
        sessionId: result.sessionId,
        runId: result.runId,
        workspaceId: workspace?.id || null,
      }

      setTabs((prev) => [...prev, newTab])
      setActiveTabId(savedSession.id)
      setActiveRun({
        runId: result.runId,
        sessionId: result.sessionId,
        state: 'starting',
      })

      if (switchToTerminal) {
        setViewMode('terminal')
      }

      return {
        success: true,
        claudeRunId: result.runId,
        ptySessionId: result.sessionId,
        sessionRecordId: savedSession.id,
      }
    },
    [],
  )

  const handleStartClaude = async () => {
    if (!status?.installed) return

    const sessionName = `Session ${new Date().toLocaleTimeString()}`
    const launch = await launchClaudeSession({
      name: sessionName,
      workspace: selectedWorkspace,
    })

    if (!launch.success && launch.error) {
      addNotification('error', 'Unable to Start Session', launch.error)
    }
  }

  const handleStopClaude = async () => {
    if (!activeRun) return
    await window.knuthflow.claude.kill(activeRun.runId)
    setActiveRun(null)
  }

  const handleCloseTab = async (tabId: string) => {
    const tab = tabs.find((item) => item.id === tabId)
    if (tab?.runId) {
      await window.knuthflow.claude.kill(tab.runId)
    }

    setTabs((prev) => {
      const remainingTabs = prev.filter((item) => item.id !== tabId)
      if (activeTabId === tabId && remainingTabs.length > 0) {
        setTimeout(() => setActiveTabId(remainingTabs[0].id), 0)
      } else if (remainingTabs.length === 0) {
        setViewMode('workspaces')
        setActiveRun(null)
      }
      return remainingTabs
    })
  }

  const handleRestoreSession = (session: Session) => {
    if (session.status === 'active') {
      console.log('Session is already active:', session)
    } else {
      console.log('Session restoration requested for completed/failed session:', session)
    }
  }

  const handleOpenFile = useCallback(async () => {
    const result = await window.knuthflow.dialog.openFile({
      defaultPath: selectedWorkspace?.path,
    })
    if (!result.canceled && result.filePath) {
      setEditorFilePath(result.filePath)
      setViewMode('editor')
    }
  }, [selectedWorkspace])

  const handleSaveFile = useCallback(
    async (filePath: string, content: string) => {
      await window.knuthflow.filesystem.writeFile(filePath, content)
      const fileName = filePath.split('/').pop() || filePath
      addNotification('info', 'File Saved', `${fileName} updated.`)
    },
    [addNotification],
  )

  const handleCloseDiff = useCallback(() => {
    setShowDiffViewer(false)
    setDiffFiles([])
  }, [])

  const activeTab = tabs.find((tab) => tab.id === activeTabId)
  const activeSessionId = activeTab?.sessionId || activeRun?.sessionId || null
  const resolvedTheme = resolveTheme(settings.theme, systemTheme)
  const statusBadge = getRunBadge(activeRun)
  const claudeStatusLabel = loading
    ? 'Checking Claude Code'
    : status?.installed
      ? `Claude Code ${status.version || 'ready'}`
      : 'Claude Code missing'

  const rootStyle = useMemo(
    () =>
      ({
        '--terminal-font-size': `${settings.fontSize}px`,
        '--terminal-font-family': settings.fontFamily || DEFAULT_SETTINGS.fontFamily,
      }) as CSSProperties,
    [settings.fontFamily, settings.fontSize],
  )

  const activeWorkspaceLabel = selectedWorkspace ? selectedWorkspace.name : 'No workspace selected'

  return (
    <div className="app-shell" data-theme={resolvedTheme} data-testid="app-shell" style={rootStyle}>
      <div className="app-frame">
        <section className="surface-panel shell-nav">
          <div className="shell-nav-main">
            <div className="shell-nav-brand">
              <div className="flex flex-col gap-1">
                <p className="nav-subtitle">{activeWorkspaceLabel}</p>
                <div className="toolbar-inline shell-nav-meta">
                  <span className={`badge ${statusBadge.className}`}>{statusBadge.label}</span>
                  {!status?.installed && !loading && (
                    <span className="badge badge-danger">Install Claude Code</span>
                  )}
                </div>
              </div>
            </div>

            <div className="toolbar-cluster">
              <div className="segmented-control" aria-label="View mode">
                {(Object.keys(VIEW_LABELS) as ViewMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className={`segmented-button ${viewMode === mode ? 'active' : ''}`}
                  >
                    {VIEW_LABELS[mode]}
                  </button>
                ))}
              </div>

              <button onClick={handleOpenFile} className="btn btn-ghost btn-icon" title="Open file">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.8}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </button>

              {updateInfo?.available && updateInfo.downloadUrl && (
                <button
                  onClick={() => {
                    if (updateInfo.downloadUrl) {
                      window.knuthflow.update.openDownload(updateInfo.downloadUrl)
                    }
                  }}
                  className="btn"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.8}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-5l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                  Update {updateInfo.version}
                </button>
              )}

              <button
                onClick={() => setShowSettings(true)}
                className="btn btn-ghost btn-icon"
                title="Settings"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.8}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.8}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </button>

              {!loading &&
                status?.installed &&
                viewMode === 'terminal' &&
                (activeRun && (activeRun.state === 'starting' || activeRun.state === 'running') ? (
                  <button onClick={handleStopClaude} className="btn btn-danger">
                    Stop Session
                  </button>
                ) : (
                  <button onClick={handleStartClaude} className="btn btn-primary">
                    New Session
                  </button>
                ))}
            </div>
          </div>
        </section>

        {settings.showTabBar && tabs.length > 0 && viewMode === 'terminal' && (
          <div className="shell-tabbar">
            {tabs.map((tab) => (
              <div
                key={tab.id}
                onClick={() => setActiveTabId(tab.id)}
                className={`session-tab ${activeTabId === tab.id ? 'active' : ''} ${tab.crashed ? 'is-crashed' : ''}`}
              >
                <span className={`status-dot ${tab.crashed ? 'danger' : 'success'}`} />
                <span className="min-w-0 flex-1 truncate">{tab.name}</span>
                <button
                  onClick={(event) => {
                    event.stopPropagation()
                    handleCloseTab(tab.id)
                  }}
                  className="btn btn-ghost btn-icon h-8 min-h-8 w-8 min-w-8"
                  title="Close tab"
                >
                  <svg
                    className="h-3.5 w-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        <main className="main-stage">
          <div className="stage-content">
            {viewMode === 'workspaces' && (
              <div className="workspace-page">
                <section className="surface-panel-muted workspace-hero">
                  <div className="workspace-hero-main">
                    <div className="stack-sm">
                      <h2 className="brand-title">Operator Workspace</h2>
                      <p className="nav-subtitle">{claudeStatusLabel}</p>
                    </div>
                  </div>
                </section>

                <div className="workspace-page-body">
                  <WorkspaceSelector
                    onSelect={handleWorkspaceSelect}
                    selectedWorkspace={selectedWorkspace}
                  />
                </div>
              </div>
            )}

            {viewMode === 'history' && (
              <SessionHistory
                onRestore={handleRestoreSession}
                currentWorkspaceId={selectedWorkspace?.id || null}
              />
            )}

            {viewMode === 'terminal' && (
              <div className="section-shell">
                <div className="list-pane !p-3">
                  <div className="h-full code-surface p-3">
                    <Terminal
                      key={`terminal-${activeSessionId ?? 'fresh'}`}
                      className="h-full"
                      sessionId={activeSessionId}
                      themeVariant={resolvedTheme}
                      fontFamily={settings.fontFamily}
                      fontSize={settings.fontSize}
                      cursorStyle={settings.cursorStyle}
                    />
                  </div>
                </div>
                {settings.showStatusBar && (
                  <footer className="status-bar">
                    <span className="text-mono">
                      {selectedWorkspace
                        ? `Workspace ${selectedWorkspace.path}`
                        : status?.installed
                          ? `Claude Code ${status.executablePath}`
                          : 'Claude Code not detected'}
                    </span>
                    <span>{getRunSummary(activeRun)}</span>
                    {activeTab?.crashed && activeTab.crashMessage && (
                      <div className="status-alert">
                        <span>
                          <strong>Session crashed.</strong> {activeTab.crashMessage}
                        </span>
                        <button
                          onClick={() => handleCloseTab(activeTab.id)}
                          className="btn btn-ghost"
                        >
                          Dismiss
                        </button>
                      </div>
                    )}
                  </footer>
                )}
              </div>
            )}

            {viewMode === 'editor' &&
              (showDiffViewer ? (
                <SplitPane direction="horizontal" className="h-full">
                  <EditorPane
                    filePath={editorFilePath}
                    readOnly={false}
                    onSave={handleSaveFile}
                    className="h-full"
                    themeVariant={resolvedTheme}
                  />
                  <DiffViewer files={diffFiles} onClose={handleCloseDiff} className="h-full" />
                </SplitPane>
              ) : (
                <SplitPane direction="horizontal" className="h-full">
                  <Terminal
                    key={`editor-terminal-${activeSessionId ?? 'fresh'}`}
                    className="h-full"
                    sessionId={activeSessionId}
                    themeVariant={resolvedTheme}
                    fontFamily={settings.fontFamily}
                    fontSize={settings.fontSize}
                    cursorStyle={settings.cursorStyle}
                  />
                  <EditorPane
                    filePath={editorFilePath}
                    readOnly={false}
                    onSave={handleSaveFile}
                    className="h-full"
                    themeVariant={resolvedTheme}
                  />
                </SplitPane>
              ))}

            {viewMode === 'console' && (
              <RalphConsolePanel
                workspace={selectedWorkspace}
                onOpenWorkspace={(path) => {
                  window.knuthflow.workspace.list().then((workspaces) => {
                    const workspace = workspaces.find((item) => item.path === path)
                    if (workspace) {
                      setSelectedWorkspace(workspace)
                    }
                  })
                  setViewMode('terminal')
                }}
                onOpenFile={(filePath) => {
                  setEditorFilePath(filePath)
                  setViewMode('editor')
                }}
                onLaunchClaudeSession={({ name, workspace }) =>
                  launchClaudeSession({
                    name,
                    args: ['--no-input'],
                    workspace,
                    switchToTerminal: false,
                  })
                }
              />
            )}
          </div>
        </main>

        <NotificationToast notifications={notifications} onDismiss={dismissNotification} />

        {showSettings && (
          <SettingsPanel
            onClose={() => setShowSettings(false)}
            onSaved={(nextSettings) => {
              setSettings(nextSettings)
              setShowSettings(false)
            }}
          />
        )}
      </div>
    </div>
  )
}
