import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  LoopSummary,
  OperatorConfirmation,
  PlanSnapshot,
  PlanTask,
  RalphArtifact,
  RalphPhase,
  RalphRunDashboardItem,
  SafetyAlert,
} from './RalphConsole.types';
import { RalphArtifactViewer } from './RalphArtifactViewer';
import { RalphFixPlanPanel } from './RalphFixPlanPanel';
import { RalphLoopHistoryPanel } from './RalphLoopHistoryPanel';
import { RalphOperatorControls } from './RalphOperatorControls';
import { RalphPhaseTimeline } from './RalphPhaseTimeline';
import { RalphRunCard } from './RalphRunCard';
import { RalphSafetyAlerts } from './RalphSafetyAlerts';

export type { RalphRunDashboardItem } from './RalphConsole.types';

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
  const [runs, setRuns] = useState<RalphRunDashboardItem[]>([]);
  const [selectedRun, setSelectedRun] = useState<RalphRunDashboardItem | null>(null);
  const [activeTab, setActiveTab] = useState<ViewTab>('dashboard');
  const [alerts, setAlerts] = useState<SafetyAlert[]>([]);
  const [pendingConfirmation, setPendingConfirmation] = useState<OperatorConfirmation | null>(null);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [artifacts, setArtifacts] = useState<RalphArtifact[]>([]);
  const [selectedArtifact, setSelectedArtifact] = useState<RalphArtifact | null>(null);
  const [fixPlanTasks, setFixPlanTasks] = useState<PlanTask[]>([]);
  const [loopSummaries, setLoopSummaries] = useState<LoopSummary[]>([]);
  const [planSnapshots, setPlanSnapshots] = useState<PlanSnapshot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadRunsRef = useRef<(() => Promise<void>) | null>(null);
  const loadSelectedRunDetailsRef = useRef<((run: RalphRunDashboardItem) => Promise<void>) | null>(null);
  const selectedRunRef = useRef<RalphRunDashboardItem | null>(null);
  const selectedRunIdRef = useRef<string | null>(null);

  const parseFixPlanTasks = (content: string): PlanTask[] => {
    const lines = content.split('\n');
    const tasks: PlanTask[] = [];
    const taskMap = new Map<string, PlanTask>();
    const stack: PlanTask[] = [];

    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      const match = line.match(/^(\s*)([-*+]|\[[ x-]\]) (.*)/);
      if (!match) continue;

      const indent = Math.floor(match[1].length / 2);
      const checkbox = match[2];
      const title = match[3].trim();

      let status: PlanTask['status'] = 'pending';
      if (checkbox === '[x]') status = 'completed';
      if (checkbox === '[-]') status = 'deferred';

      while (stack.length > 0 && stack[stack.length - 1].indentLevel >= indent) {
        stack.pop();
      }

      const parentId = stack.length > 0 ? stack[stack.length - 1].id : null;

      const task: PlanTask = {
        id: `task-${index}-${title.slice(0, 20).replace(/[^a-zA-Z0-9]/g, '')}`,
        title,
        description: '',
        status,
        checkbox,
        lineNumber: index + 1,
        indentLevel: indent,
        priority: 0,
        children: [],
        parentId,
      };

      if (parentId) {
        taskMap.get(parentId)?.children.push(task);
      } else {
        tasks.push(task);
      }

      taskMap.set(task.id, task);
      stack.push(task);
    }

    return tasks;
  };

  const loadRuns = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const projects = await window.knuthflow.workspace.list();
      const nextRuns: RalphRunDashboardItem[] = [];

      for (const project of projects) {
        const projectRuns = await window.knuthflow.ralph.getProjectRuns(project.id);
        for (const run of projectRuns) {
          let phase: RalphPhase = 'idle';

          if (run.status === 'running' || run.status === 'pending') {
            try {
              const runtimeState = await window.knuthflow.ralphRuntime?.getState(run.id);
              if (runtimeState?.success && runtimeState.state) {
                phase = runtimeState.state;
              }
            } catch (error) {
              console.debug('Runtime state unavailable:', error);
            }
          } else if (run.status === 'completed') {
            phase = 'completed';
          } else if (run.status === 'failed') {
            phase = 'failed';
          }

          nextRuns.push({
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

      setRuns(nextRuns);
    } catch (error) {
      console.error('Failed to load Ralph runs:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  const loadSelectedRunDetails = useCallback(async (run: RalphRunDashboardItem) => {
    setIsLoading(true);
    try {
      const [summaries, snapshots, artifactList] = await Promise.all([
        window.knuthflow.ralph.getRunSummaries(run.runId),
        window.knuthflow.ralph.getRunSnapshots(run.runId),
        window.knuthflow.ralph.listArtifacts({ runId: run.runId }),
      ]);

      setLoopSummaries(summaries || []);
      setPlanSnapshots(snapshots || []);
      setArtifacts(artifactList || []);

      const events: TimelineEvent[] = (summaries || []).map((summary, index) => ({
        iteration: summary.iteration,
        phase: index === (summaries?.length ?? 0) - 1 && run.status === 'running' ? 'executing' : 'completed',
        timestamp: summary.createdAt,
        selectedItem: summary.prompt.slice(0, 50),
        outcome: 'success',
      }));

      if (run.status === 'running') {
        events.push({
          iteration: (summaries?.length ?? 0) + 1,
          phase: run.phase,
          timestamp: Date.now(),
          selectedItem: run.selectedItem?.title,
        });
      }

      setTimelineEvents(events);

      if (run.workspacePath) {
        try {
          const content = await window.knuthflow.filesystem.readFile(`${run.workspacePath}/fix_plan.md`);
          setFixPlanTasks(content ? parseFixPlanTasks(content) : []);
        } catch (error) {
          console.debug('fix_plan.md not available:', error);
          setFixPlanTasks([]);
        }
      } else {
        setFixPlanTasks([]);
      }
    } catch (error) {
      console.error('Failed to load run details:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSelectRun = useCallback((run: RalphRunDashboardItem) => {
    setSelectedRun(run);
    loadSelectedRunDetails(run);
  }, [loadSelectedRunDetails]);

  const handleOperatorAction = useCallback(async (action: 'pause' | 'resume' | 'stop' | 'replan' | 'validate') => {
    if (!selectedRun) return;

    if (action === 'stop') {
      setPendingConfirmation({
        action: 'stop',
        title: 'Stop Ralph run?',
        message: 'This will terminate the active run and interrupt any in-flight work.',
        confirmLabel: 'Stop Run',
        cancelLabel: 'Cancel',
        isDangerous: true,
      });
      return;
    }

    if (action === 'replan') {
      setPendingConfirmation({
        action: 'replan',
        title: 'Regenerate fix plan?',
        message: 'This rebuilds the run plan while preserving existing context and snapshots.',
        confirmLabel: 'Replan',
        cancelLabel: 'Cancel',
        isDangerous: false,
      });
      return;
    }

    try {
      switch (action) {
        case 'pause':
          await window.knuthflow.ralph.pauseRun(selectedRun.runId);
          break;
        case 'resume':
          await window.knuthflow.ralph.resumeRun(selectedRun.runId);
          break;
        case 'validate':
          await window.knuthflow.ralph.validateRun(selectedRun.runId);
          break;
        default:
          break;
      }
      await loadRuns();
    } catch (error) {
      console.error(`Failed to ${action} run:`, error);
    }
  }, [loadRuns, selectedRun]);

  const handleConfirm = useCallback(async () => {
    if (!pendingConfirmation || !selectedRun) return;

    try {
      if (pendingConfirmation.action === 'stop') {
        await window.knuthflow.ralph.stopRun(selectedRun.runId);
      }

      if (pendingConfirmation.action === 'replan') {
        await window.knuthflow.ralph.replanRun(selectedRun.runId);
      }

      setPendingConfirmation(null);
      await loadRuns();
    } catch (error) {
      console.error(`Failed to ${pendingConfirmation.action}:`, error);
    }
  }, [loadRuns, pendingConfirmation, selectedRun]);

  useEffect(() => {
    loadRunsRef.current = loadRuns;
    loadSelectedRunDetailsRef.current = loadSelectedRunDetails;
  }, [loadRuns, loadSelectedRunDetails]);

  useEffect(() => {
    loadRunsRef.current?.();
  }, []);

  useEffect(() => {
    selectedRunRef.current = selectedRun;
    selectedRunIdRef.current = selectedRun?.runId ?? null;
  }, [selectedRun]);

  useEffect(() => {
    const interval = setInterval(async () => {
      const currentRunId = selectedRunIdRef.current;
      if (currentRunId && selectedRunRef.current?.status === 'running') {
        await loadRunsRef.current?.();
        if (currentRunId === selectedRunIdRef.current && selectedRunRef.current) {
          await loadSelectedRunDetailsRef.current?.(selectedRunRef.current);
        }
      }
    }, POLLING_INTERVAL_MS);

    return () => clearInterval(interval);
  }, []);

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
    <div className="section-shell">
      <div className="section-header">
        <div>
          <h2 className="section-title">Ralph Console</h2>
          <p className="section-lead">Operational dashboard for autonomous runs, fix plans, artifacts, and manual intervention.</p>
        </div>
        <div className="toolbar-inline">
          <span className="badge badge-neutral">{runs.length} runs</span>
          <button onClick={() => loadRuns()} disabled={isRefreshing} className="btn">
            {isRefreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        <aside className="w-80 flex-shrink-0 border-r border-[var(--border-subtle)]">
          <div className="section-header !border-b-0">
            <div>
              <p className="metric-label">Runs</p>
              <p className="m-0 text-sm text-muted">Select a run to inspect details.</p>
            </div>
          </div>
          <div className="list-pane !pt-0">
            <div className="stack-sm">
              {runs.length === 0 ? (
                <div className="empty-state surface-panel-muted">
                  <div>
                    <h3 className="text-lg font-semibold">No Ralph runs found</h3>
                    <p className="mt-2 text-sm text-muted">Start a Ralph run from a workspace to populate the console.</p>
                  </div>
                </div>
              ) : runs.map(run => (
                <RalphRunCard
                  key={run.runId}
                  run={run}
                  isSelected={selectedRun?.runId === run.runId}
                  onSelect={handleSelectRun}
                  onOpenWorkspace={onOpenWorkspace}
                />
              ))}
            </div>
          </div>
        </aside>

        <div className="flex min-h-0 flex-1 flex-col">
          {selectedRun ? (
            <>
              <div className="section-header !border-b-0">
                <div>
                  <h3 className="section-title">{selectedRun.name}</h3>
                  <p className="section-lead">
                    {selectedRun.workspaceName} • {selectedRun.workspacePath}
                  </p>
                </div>
                <div className="toolbar-inline">
                  <span className={selectedRun.status === 'completed' ? 'badge badge-success' : selectedRun.status === 'failed' ? 'badge badge-danger' : selectedRun.status === 'paused' ? 'badge badge-warning' : 'badge badge-info'}>
                    {selectedRun.status}
                  </span>
                  <span className="badge badge-neutral">{selectedRun.phase}</span>
                </div>
              </div>

              <div className="px-4 pb-3">
                <div className="segmented-control">
                  {tabs.map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`segmented-button ${activeTab === tab.id ? 'active' : ''}`}
                    >
                      {tab.label}
                      {tab.count !== undefined && tab.count > 0 ? ` (${tab.count})` : ''}
                    </button>
                  ))}
                </div>
              </div>

              <div className="min-h-0 flex-1">
                {activeTab === 'dashboard' && (
                  <div className="list-pane">
                    <div className="metrics-grid">
                      <div className="metric-card">
                        <p className="metric-label">Run ID</p>
                        <p className="metric-value text-mono">{selectedRun.runId.slice(0, 12)}…</p>
                      </div>
                      <div className="metric-card">
                        <p className="metric-label">Iterations</p>
                        <p className="metric-value">{selectedRun.iterationCount}</p>
                      </div>
                      <div className="metric-card">
                        <p className="metric-label">Status</p>
                        <p className="metric-value">{selectedRun.status}</p>
                      </div>
                      <div className="metric-card">
                        <p className="metric-label">Phase</p>
                        <p className="metric-value">{selectedRun.phase}</p>
                      </div>
                      {selectedRun.selectedItem && (
                        <div className="metric-card">
                          <p className="metric-label">Current Task</p>
                          <p className="metric-value">{selectedRun.selectedItem.title}</p>
                          {selectedRun.selectedItem.description && (
                            <p className="mt-2 text-sm text-muted">{selectedRun.selectedItem.description}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'timeline' && (
                  <RalphPhaseTimeline events={timelineEvents} currentIteration={selectedRun.iterationCount} />
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
                    onOpenInEditor={(filePath, lineNumber) => onOpenFile(filePath, lineNumber)}
                    workspacePath={selectedRun.workspacePath}
                  />
                )}

                {activeTab === 'history' && (
                  <RalphLoopHistoryPanel
                    summaries={loopSummaries}
                    snapshots={planSnapshots}
                    onViewArtifact={(summaryId) => {
                      setActiveTab('artifacts');
                      const artifact = artifacts.find(item => item.itemId === summaryId);
                      if (artifact) setSelectedArtifact(artifact);
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
                    onCancelConfirmation={() => setPendingConfirmation(null)}
                  />
                )}

                {activeTab === 'alerts' && (
                  <RalphSafetyAlerts
                    alerts={alerts}
                    onDismiss={(id) => setAlerts(prev => prev.filter(alert => alert.id !== id))}
                    onViewDetails={(alert) => console.debug('Alert details:', alert)}
                  />
                )}
              </div>
            </>
          ) : (
            <div className="empty-state">
              <div>
                <h3 className="text-lg font-semibold">Select a Ralph run</h3>
                <p className="mt-2 text-sm text-muted">Pick a run from the left column to inspect its state and outputs.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {isLoading && (
        <div className="absolute inset-0 grid place-items-center bg-[rgba(6,14,28,0.32)]">
          <div className="surface-panel-muted px-5 py-4">
            <p className="m-0 text-sm font-semibold">Loading Ralph data</p>
          </div>
        </div>
      )}
    </div>
  );
}
