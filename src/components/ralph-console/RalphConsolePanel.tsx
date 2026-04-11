import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  RalphRunDashboardItem,
  RalphPhase,
  OperatorControlAction,
  SafetyAlert,
  OperatorConfirmation,
  PlanTask,
  LoopSummary,
  PlanSnapshot,
  RalphArtifact,
} from './RalphConsole.types';
import { RalphRunCard } from './RalphRunCard';
import { RalphPhaseTimeline } from './RalphPhaseTimeline';
import { RalphArtifactViewer } from './RalphArtifactViewer';
import { RalphFixPlanPanel } from './RalphFixPlanPanel';
import { RalphLoopHistoryPanel } from './RalphLoopHistoryPanel';
import { RalphOperatorControls } from './RalphOperatorControls';
import { RalphSafetyAlerts } from './RalphSafetyAlerts';

export type { RalphRunDashboardItem } from './RalphConsole.types';

// Extended types for IPC calls not yet in preload
interface RalphRuntime {
  getState(runId: string): Promise<{ success: boolean; state?: RalphPhase }>;
}

interface RalphAPI {
  getProjectRuns(projectId: string): Promise<Array<{
    id: string;
    projectId: string;
    name: string;
    status: string;
    iterationCount: number;
    startTime: number | null;
    endTime: number | null;
    error: string | null;
  }>>;
  getRunSummaries(runId: string): Promise<LoopSummary[]>;
  getRunSnapshots(runId: string): Promise<PlanSnapshot[]>;
  listArtifacts(options: { runId: string }): Promise<RalphArtifact[]>;
  pauseRun(runId: string): Promise<void>;
  resumeRun(runId: string): Promise<void>;
  stopRun(runId: string): Promise<void>;
  replanRun(runId: string): Promise<void>;
  validateRun(runId: string): Promise<void>;
}

declare global {
  interface Window {
    knuthflow: {
      workspace: {
        list(): Promise<Array<{ id: string; name: string; path: string }>>;
      };
      ralph: RalphAPI;
      ralphRuntime?: RalphRuntime;
      filesystem?: {
        readFile(path: string): Promise<string>;
      };
    };
  }
}

interface RalphConsolePanelProps {
  workspacePath: string | null;
  onOpenWorkspace: (workspacePath: string) => void;
  onOpenFile: (filePath: string, lineNumber?: number) => void;
}

type ViewTab = 'dashboard' | 'timeline' | 'artifacts' | 'plan' | 'history' | 'controls' | 'alerts';

interface TimelineEvent {
  iteration: number;
  phase: RalphPhase;
  timestamp: number;
  selectedItem?: string;
  artifactCount?: number;
  durationMs?: number;
  outcome?: 'success' | 'failed' | 'skipped';
}

const POLLING_INTERVAL_MS = 5000;

export function RalphConsolePanel({ onOpenWorkspace, onOpenFile }: RalphConsolePanelProps) {
  // State
  const [runs, setRuns] = useState<RalphRunDashboardItem[]>([]);
  const [selectedRun, setSelectedRun] = useState<RalphRunDashboardItem | null>(null);
  const [activeTab, setActiveTab] = useState<ViewTab>('dashboard');
  const [alerts, setAlerts] = useState<SafetyAlert[]>([]);
  const [pendingConfirmation, setPendingConfirmation] = useState<OperatorConfirmation | null>(null);

  // Selected run details
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [artifacts, setArtifacts] = useState<RalphArtifact[]>([]);
  const [selectedArtifact, setSelectedArtifact] = useState<RalphArtifact | null>(null);
  const [fixPlanTasks, setFixPlanTasks] = useState<PlanTask[]>([]);
  const [loopSummaries, setLoopSummaries] = useState<LoopSummary[]>([]);
  const [planSnapshots, setPlanSnapshots] = useState<PlanSnapshot[]>([]);

  // Loading states
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadRuns();
  }, []);

  // Load runs from the main process
  const loadRuns = useCallback(async () => {
    setIsRefreshing(true);
    try {
      // Get all Ralph projects and their runs
      const projects = await window.knuthflow.workspace.list();
      const allRuns: RalphRunDashboardItem[] = [];

      for (const project of projects) {
        const runs = await window.knuthflow.ralph.getProjectRuns(project.id);
        for (const run of runs) {
          // Determine phase based on run status
          let phase: RalphPhase = 'idle';

          if (run.status === 'running' || run.status === 'pending') {
            // Get runtime state from main process via IPC
            try {
              const state = await window.knuthflow.ralphRuntime?.getState(run.id);
              if (state?.success && state.state) {
                phase = state.state;
              }
            } catch (err) {
              console.debug('Runtime state not available:', err);
            }
          } else if (run.status === 'completed') {
            phase = 'completed';
          } else if (run.status === 'failed') {
            phase = 'failed';
          }

          allRuns.push({
            runId: run.id,
            projectId: run.projectId,
            workspaceName: project.name,
            workspacePath: project.path,
            name: run.name,
            status: run.status,
            phase,
            selectedItem: null,
            safetyState: null,
            iterationCount: run.iterationCount,
            loopCount: run.iterationCount,
            startTime: run.startTime,
            endTime: run.endTime,
            error: run.error,
          });
        }
      }

      setRuns(allRuns);
    } catch (error) {
      console.error('Failed to load Ralph runs:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Load details for selected run
  const loadSelectedRunDetails = useCallback(async (run: RalphRunDashboardItem) => {
    setIsLoading(true);
    try {
      // Load loop summaries
      const summaries = await window.knuthflow.ralph.getRunSummaries(run.runId);
      setLoopSummaries(summaries || []);

      // Load plan snapshots
      const snapshots = await window.knuthflow.ralph.getRunSnapshots(run.runId);
      setPlanSnapshots(snapshots || []);

      // Load artifacts
      const artifactList = await window.knuthflow.ralph.listArtifacts({ runId: run.runId });
      setArtifacts(artifactList || []);

      // Build timeline events from summaries
      const events: TimelineEvent[] = (summaries || []).map((s: LoopSummary, index: number) => ({
        iteration: s.iteration,
        phase: index === (summaries?.length ?? 0) - 1 && run.status === 'running' ? 'executing' : 'completed',
        timestamp: s.createdAt,
        selectedItem: s.prompt.slice(0, 50),
        outcome: 'success' as const,
      }));

      // Add current phase if running
      if (run.status === 'running') {
        events.push({
          iteration: (summaries?.length ?? 0) + 1,
          phase: run.phase,
          timestamp: Date.now(),
          selectedItem: run.selectedItem?.title,
        });
      }

      setTimelineEvents(events);

      // Load fix_plan.md tasks if workspace is available
      if (run.workspacePath) {
        try {
          const content = await window.knuthflow.filesystem?.readFile?.(`${run.workspacePath}/fix_plan.md`);
          if (content) {
            // Parse fix_plan.md into tasks
            const tasks = parseFixPlanTasks(content);
            setFixPlanTasks(tasks);
          }
        } catch (err) {
          console.debug('fix_plan.md not available:', err);
          setFixPlanTasks([]);
        }
      }
    } catch (error) {
      console.error('Failed to load run details:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle run selection
  const handleSelectRun = useCallback((run: RalphRunDashboardItem) => {
    setSelectedRun(run);
    loadSelectedRunDetails(run);
  }, [loadSelectedRunDetails]);

  // Handle operator action
  const handleOperatorAction = useCallback(async (action: OperatorControlAction) => {
    if (!selectedRun) return;

    // Handle confirmation for dangerous actions
    if (action === 'stop') {
      setPendingConfirmation({
        action: 'stop',
        title: 'Stop Ralph Run?',
        message: 'This will terminate the current Ralph run. Any in-progress work may be lost. This action cannot be undone.',
        confirmLabel: 'Stop Run',
        cancelLabel: 'Cancel',
        isDangerous: true,
      });
      return;
    }

    if (action === 'replan') {
      setPendingConfirmation({
        action: 'replan',
        title: 'Replan Ralph Run?',
        message: 'This will regenerate the fix_plan.md and reset the loop state. Current progress on tasks will be preserved.',
        confirmLabel: 'Replan',
        cancelLabel: 'Cancel',
        isDangerous: false,
      });
      return;
    }

    // Execute action via IPC
    try {
      const ralphAPI = window.knuthflow.ralph;
      switch (action) {
        case 'pause':
          await ralphAPI.pauseRun(selectedRun.runId);
          break;
        case 'resume':
          await ralphAPI.resumeRun(selectedRun.runId);
          break;
        case 'stop':
          await ralphAPI.stopRun(selectedRun.runId);
          break;
        case 'replan':
          await ralphAPI.replanRun(selectedRun.runId);
          break;
        case 'validate':
          await ralphAPI.validateRun(selectedRun.runId);
          break;
      }
      await loadRuns();
      setSelectedRun(currentRuns => {
        return currentRuns.find(r => r.runId === selectedRun.runId) ?? selectedRun;
      });
    } catch (error) {
      console.error(`Failed to ${action} run:`, error);
    }
  }, [selectedRun, loadRuns, loadSelectedRunDetails]);

  // Handle confirmation
  const handleConfirm = useCallback(async () => {
    if (!pendingConfirmation || !selectedRun) return;

    try {
      const ralphAPI = window.knuthflow.ralph;
      switch (pendingConfirmation.action) {
        case 'pause':
          await ralphAPI.pauseRun(selectedRun.runId);
          break;
        case 'resume':
          await ralphAPI.resumeRun(selectedRun.runId);
          break;
        case 'stop':
          await ralphAPI.stopRun(selectedRun.runId);
          break;
        case 'replan':
          await ralphAPI.replanRun(selectedRun.runId);
          break;
        case 'validate':
          await ralphAPI.validateRun(selectedRun.runId);
          break;
      }
      setPendingConfirmation(null);
      await loadRuns();
      setSelectedRun(currentRuns => {
        return currentRuns.find(r => r.runId === selectedRun.runId) ?? selectedRun;
      });
    } catch (error) {
      console.error(`Failed to ${pendingConfirmation.action}:`, error);
    }
  }, [pendingConfirmation, selectedRun, loadRuns]);

  // Handle confirmation cancel
  const handleCancelConfirmation = useCallback(() => {
    setPendingConfirmation(null);
  }, []);

  // Parse fix_plan.md content into tasks
  const parseFixPlanTasks = (content: string): PlanTask[] => {
    const lines = content.split('\n');
    const tasks: PlanTask[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const match = line.match(/^(\s*)([-*+]|\[[ x]\]) (.*)/);
      if (match) {
        const indent = Math.floor(match[1].length / 2);
        const checkbox = match[2];
        const title = match[3].trim();

        // Determine status from checkbox
        let status: PlanTask['status'] = 'pending';
        if (checkbox === '[x]') status = 'completed';
        else if (checkbox === '[-]') status = 'deferred';

        tasks.push({
          id: `task-${i}`,
          title,
          description: '',
          status,
          checkbox,
          lineNumber: i + 1,
          indentLevel: indent,
          priority: 0,
          children: [],
          parentId: null,
        });
      }
    }

    return tasks;
  };

  // Handle workspace open
  const handleOpenWorkspace = useCallback((path: string) => {
    onOpenWorkspace(path);
  }, [onOpenWorkspace]);

  // Handle file open in editor
  const handleOpenInEditor = useCallback((filePath: string, lineNumber: number) => {
    onOpenFile(filePath, lineNumber);
  }, [onOpenFile]);

  // Poll for updates (every 5 seconds when running)
  const selectedRunRef = useRef(selectedRun);
  useEffect(() => {
    selectedRunRef.current = selectedRun;
  }, [selectedRun]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (selectedRunRef.current?.status === 'running') {
        loadRuns();
        if (selectedRunRef.current) {
          loadSelectedRunDetails(selectedRunRef.current);
        }
      }
    }, POLLING_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [loadRuns, loadSelectedRunDetails]);

  // Tab definitions
  const tabs: { id: ViewTab; label: string; count?: number }[] = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'timeline', label: 'Timeline', count: timelineEvents.length },
    { id: 'artifacts', label: 'Artifacts', count: artifacts.length },
    { id: 'plan', label: 'Fix Plan', count: fixPlanTasks.length },
    { id: 'history', label: 'History', count: loopSummaries.length },
    { id: 'controls', label: 'Controls' },
    { id: 'alerts', label: 'Alerts', count: alerts.length },
  ];

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-medium text-white">Ralph Console</h2>
          <button
            onClick={() => loadRuns()}
            disabled={isRefreshing}
            className="text-xs text-gray-400 hover:text-white disabled:opacity-50"
          >
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex items-center gap-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                relative px-3 py-1.5 text-sm rounded transition-colors
                ${activeTab === tab.id
                  ? 'bg-gray-700 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-750'}
              `}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="ml-1 px-1.5 py-0.5 bg-gray-600 text-xs rounded-full">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex min-h-0">
        {/* Run list sidebar */}
        <div className="w-72 flex-shrink-0 border-r border-gray-700 flex flex-col">
          <div className="px-3 py-2 bg-gray-850 border-b border-gray-700">
            <h3 className="text-sm font-medium text-white">Ralph Runs</h3>
            <p className="text-xs text-gray-400">{runs.length} run{runs.length !== 1 ? 's' : ''}</p>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {runs.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-gray-500 text-sm">
                No Ralph runs found
              </div>
            ) : (
              runs.map(run => (
                <RalphRunCard
                  key={run.runId}
                  run={run}
                  isSelected={selectedRun?.runId === run.runId}
                  onSelect={handleSelectRun}
                  onOpenWorkspace={handleOpenWorkspace}
                />
              ))
            )}
          </div>
        </div>

        {/* Main panel */}
        <div className="flex-1 flex flex-col min-w-0">
          {selectedRun ? (
            <>
              {/* Run header */}
              <div className="px-4 py-3 bg-gray-850 border-b border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-md font-medium text-white">{selectedRun.name}</h3>
                    <p className="text-xs text-gray-400">
                      {selectedRun.workspaceName} • {selectedRun.workspacePath}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`
                      px-2 py-1 rounded text-xs font-medium
                      ${selectedRun.status === 'running' ? 'bg-blue-900 text-blue-300' :
                        selectedRun.status === 'paused' ? 'bg-yellow-900 text-yellow-300' :
                        selectedRun.status === 'completed' ? 'bg-green-900 text-green-300' :
                        'bg-red-900 text-red-300'}
                    `}>
                      {selectedRun.status}
                    </span>
                    <span className="text-xs text-gray-400">
                      {selectedRun.phase}
                    </span>
                  </div>
                </div>
              </div>

              {/* Tab content */}
              <div className="flex-1 min-h-0 overflow-hidden">
                {activeTab === 'dashboard' && (
                  <div className="h-full p-4">
                    <div className="grid grid-cols-2 gap-4">
                      {/* Run info */}
                      <div className="bg-gray-800 rounded-lg p-4">
                        <h4 className="text-sm font-medium text-white mb-3">Run Info</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Run ID:</span>
                            <span className="text-white font-mono text-xs">{selectedRun.runId.slice(0, 12)}...</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Iterations:</span>
                            <span className="text-white">{selectedRun.iterationCount}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Status:</span>
                            <span className="text-white">{selectedRun.status}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Phase:</span>
                            <span className="text-white">{selectedRun.phase}</span>
                          </div>
                        </div>
                      </div>

                      {/* Safety state */}
                      {selectedRun.safetyState && (
                        <div className="bg-gray-800 rounded-lg p-4">
                          <h4 className="text-sm font-medium text-white mb-3">Safety State</h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-400">Circuit Breaker:</span>
                              <span className={selectedRun.safetyState.circuitBreakerOpen ? 'text-red-400' : 'text-green-400'}>
                                {selectedRun.safetyState.circuitBreakerOpen ? 'OPEN' : 'Closed'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Rate Limit Calls:</span>
                              <span className="text-white">{selectedRun.safetyState.rateLimitCallsRemaining}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">No Progress Count:</span>
                              <span className="text-white">{selectedRun.safetyState.noProgressCount}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Selected item */}
                      {selectedRun.selectedItem && (
                        <div className="bg-gray-800 rounded-lg p-4">
                          <h4 className="text-sm font-medium text-white mb-3">Current Task</h4>
                          <p className="text-white">{selectedRun.selectedItem.title}</p>
                          {selectedRun.selectedItem.description && (
                            <p className="text-xs text-gray-400 mt-1">{selectedRun.selectedItem.description}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'timeline' && (
                  <RalphPhaseTimeline
                    events={timelineEvents}
                    currentIteration={selectedRun.iterationCount}
                  />
                )}

                {activeTab === 'artifacts' && (
                  <RalphArtifactViewer
                    artifacts={artifacts}
                    selectedArtifact={selectedArtifact}
                    onSelectArtifact={setSelectedArtifact}
                  />
                )}

                {activeTab === 'plan' && (
                  <RalphFixPlanPanel
                    tasks={fixPlanTasks}
                    selectedItemId={selectedRun.selectedItem?.id}
                    onOpenInEditor={handleOpenInEditor}
                    workspacePath={selectedRun.workspacePath}
                  />
                )}

                {activeTab === 'history' && (
                  <RalphLoopHistoryPanel
                    summaries={loopSummaries}
                    snapshots={planSnapshots}
                    onViewArtifact={(id) => {
                      const summary = loopSummaries.find(s => s.id === id);
                      if (summary) {
                        console.debug('View artifact:', summary);
                      }
                    }}
                  />
                )}

                {activeTab === 'controls' && (
                  <RalphOperatorControls
                    currentPhase={selectedRun.phase}
                    isRunning={selectedRun.status === 'running'}
                    canPause={['starting', 'planning', 'executing', 'validating'].includes(selectedRun.phase)}
                    canResume={selectedRun.phase === 'paused'}
                    canStop={selectedRun.status === 'running' || selectedRun.status === 'paused'}
                    onAction={handleOperatorAction}
                    pendingConfirmation={pendingConfirmation}
                    onConfirm={handleConfirm}
                    onCancelConfirmation={handleCancelConfirmation}
                  />
                )}

                {activeTab === 'alerts' && (
                  <RalphSafetyAlerts
                    alerts={alerts}
                    onDismiss={(id) => setAlerts(prev => prev.filter(a => a.id !== id))}
                    onViewDetails={(alert) => {
                      console.debug('View alert details:', alert);
                    }}
                  />
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <svg className="w-12 h-12 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p>Select a Ralph run to view details</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-gray-900/50 flex items-center justify-center">
          <div className="flex items-center gap-2 text-white">
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span>Loading...</span>
          </div>
        </div>
      )}
    </div>
  );
}