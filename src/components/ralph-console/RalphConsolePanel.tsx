import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { Workspace } from '../../preload';
import type {
  AppBlueprint,
  AppIntakeDraft,
  LoopRun,
  RalphProject,
  ReadinessReport,
} from '../../shared/preloadTypes';
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
import { AppIntakeForm } from './AppIntakeForm';
import { BlueprintReview } from './BlueprintReview';
import { RalphArtifactViewer } from './RalphArtifactViewer';
import { RalphFixPlanPanel } from './RalphFixPlanPanel';
import { RalphLoopHistoryPanel } from './RalphLoopHistoryPanel';
import { RalphOperatorControls } from './RalphOperatorControls';
import { RalphPhaseTimeline } from './RalphPhaseTimeline';
import { RalphRunCard } from './RalphRunCard';
import { RalphSafetyAlerts } from './RalphSafetyAlerts';

// Error boundary for kickoff workflow
interface KickoffErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class KickoffErrorBoundary extends React.Component<
  { children: React.ReactNode; onReset: () => void },
  KickoffErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode; onReset: () => void }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): KickoffErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('Kickoff workflow error:', error, errorInfo);
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div className="p-4 border border-red-500 rounded">
          <h3 className="text-red-300 font-semibold">Something went wrong</h3>
          <p className="text-sm text-muted mt-2">{this.state.error?.message}</p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              this.props.onReset();
            }}
            className="btn btn-primary mt-4"
          >
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export type { RalphRunDashboardItem } from './RalphConsole.types';

interface RalphConsolePanelProps {
  workspace: Workspace | null;
  onOpenWorkspace: (workspacePath: string) => void;
  onOpenFile: (filePath: string, lineNumber?: number) => void;
  onLaunchClaudeSession: (options: {
    name: string;
    workspace: Workspace;
  }) => Promise<{
    success: boolean;
    claudeRunId?: string;
    ptySessionId?: string;
    sessionRecordId?: string;
    error?: string;
  }>;
}

type ViewTab = 'dashboard' | 'timeline' | 'artifacts' | 'plan' | 'history' | 'controls' | 'alerts';
type WorkspaceActionState = 'bootstrap' | 'repair' | 'start' | null;
type KickoffState = 'idle' | 'intake' | 'review' | 'approved';

interface TimelineEvent {
  iteration: number;
  phase: RalphPhase;
  timestamp: number;
  selectedItem?: string;
  artifactCount?: number;
  durationMs?: number;
  outcome?: 'success' | 'failed' | 'skipped';
}

interface WorkspaceNotice {
  tone: 'info' | 'error';
  message: string;
}

const POLLING_INTERVAL_MS = 5000;

function summarizeIssues(report: ReadinessReport | null): string {
  if (!report) return 'Inspect readiness before starting a run.';
  if (report.ready) return 'Control files are in place and Ralph can start from this workspace.';
  if (report.issues.length === 0) return 'Ralph needs attention before it can start.';
  return report.issues[0].message;
}

function formatBootstrapResult(result: {
  created: string[];
  updated: string[];
  skipped: string[];
}): string {
  const fragments: string[] = [];

  if (result.created.length > 0) {
    fragments.push(`created ${result.created.join(', ')}`);
  }

  if (result.updated.length > 0) {
    fragments.push(`updated ${result.updated.join(', ')}`);
  }

  if (result.skipped.length > 0 && fragments.length === 0) {
    fragments.push(`kept ${result.skipped.join(', ')}`);
  }

  return fragments.length > 0 ? fragments.join(' • ') : 'Ralph control files are ready.';
}

function getReadinessBadge(report: ReadinessReport | null) {
  if (!report) {
    return { className: 'badge badge-neutral', label: 'Unchecked' };
  }

  if (report.ready) {
    return { className: 'badge badge-success', label: 'Ready' };
  }

  return { className: 'badge badge-warning', label: report.isFresh ? 'Needs Bootstrap' : 'Needs Repair' };
}

function getRunStatusBadge(status: RalphRunDashboardItem['status']) {
  if (status === 'completed') return 'badge badge-success';
  if (status === 'failed') return 'badge badge-danger';
  if (status === 'paused' || status === 'cancelled') return 'badge badge-warning';
  return 'badge badge-info';
}

export function RalphConsolePanel({
  workspace,
  onOpenWorkspace,
  onOpenFile,
  onLaunchClaudeSession,
}: RalphConsolePanelProps) {
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
  const [workspaceProject, setWorkspaceProject] = useState<RalphProject | null>(null);
  const [workspaceReadiness, setWorkspaceReadiness] = useState<ReadinessReport | null>(null);
  const [activeWorkspaceRuns, setActiveWorkspaceRuns] = useState<LoopRun[]>([]);
  const [workspaceActionState, setWorkspaceActionState] = useState<WorkspaceActionState>(null);
  const [workspaceNotice, setWorkspaceNotice] = useState<WorkspaceNotice | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Kickoff workflow state (Phase 13)
  const [kickoffState, setKickoffState] = useState<KickoffState>('idle');
  const [kickoffDraft, setKickoffDraft] = useState<AppIntakeDraft | null>(null);
  const [generatedBlueprint, setGeneratedBlueprint] = useState<AppBlueprint | null>(null);
  const [kickoffError, setKickoffError] = useState<string | null>(null);
  const [isKickoffSubmitting, setIsKickoffSubmitting] = useState(false);

  const loadRunsRef = useRef<(() => Promise<RalphRunDashboardItem[]>) | null>(null);
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

  const loadWorkspaceContext = useCallback(async () => {
    if (!workspace) {
      setWorkspaceProject(null);
      setWorkspaceReadiness(null);
      setActiveWorkspaceRuns([]);
      return;
    }

    try {
      const [report, project] = await Promise.all([
        window.knuthflow.ralph.getReadinessReport(workspace.id, workspace.path),
        window.knuthflow.ralph.getProject(workspace.id),
      ]);

      setWorkspaceReadiness(report);
      setWorkspaceProject(project);

      if (project) {
        const activeRuns = await window.knuthflow.ralph.getActiveRuns(project.id);
        setActiveWorkspaceRuns(activeRuns);
      } else {
        setActiveWorkspaceRuns([]);
      }
    } catch (error) {
      console.error('Failed to load Ralph workspace context:', error);
      setWorkspaceNotice({
        tone: 'error',
        message: error instanceof Error ? error.message : 'Unable to load Ralph workspace state.',
      });
    }
  }, [workspace]);

  const loadRuns = useCallback(async (): Promise<RalphRunDashboardItem[]> => {
    setIsRefreshing(true);
    try {
      const workspaces = await window.knuthflow.workspace.list();
      const nextRuns: RalphRunDashboardItem[] = [];

      for (const workspaceItem of workspaces) {
        const project = await window.knuthflow.ralph.getProject(workspaceItem.id);
        if (!project) continue;

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
          } else if (run.status === 'cancelled') {
            phase = 'cancelled';
          } else if (run.status === 'failed') {
            phase = 'failed';
          }

          const status = phase === 'paused' ? 'paused' : run.status;

          nextRuns.push({
            runId: run.id,
            projectId: run.projectId,
            sessionId: run.sessionId,
            ptySessionId: run.ptySessionId,
            workspaceName: workspaceItem.name,
            workspacePath: workspaceItem.path,
            name: run.name,
            status,
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

      const selectedRunId = selectedRunIdRef.current;
      const nextSelectedRun = selectedRunId ? nextRuns.find((run) => run.runId === selectedRunId) ?? null : null;
      selectedRunRef.current = nextSelectedRun;
      setSelectedRun(nextSelectedRun);

      return nextRuns;
    } catch (error) {
      console.error('Failed to load Ralph runs:', error);
      return [];
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

  const openControlFile = useCallback((fileName: 'PROMPT.md' | 'AGENT.md' | 'fix_plan.md') => {
    if (!workspace) return;
    onOpenFile(`${workspace.path}/${fileName}`, 1);
  }, [onOpenFile, workspace]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Kickoff Workflow (Phase 13: Goal To App Bootstrap)
  // ─────────────────────────────────────────────────────────────────────────────

  const handleStartKickoff = useCallback(() => {
    setKickoffState('intake');
    setKickoffDraft(null);
    setGeneratedBlueprint(null);
    setKickoffError(null);
  }, []);

  const handleIntakeSubmit = useCallback(async (intake: AppIntakeDraft) => {
    if (!workspace) return;

    setIsKickoffSubmitting(true);
    setKickoffError(null);
    setKickoffDraft(intake);
    setGeneratedBlueprint(null);

    try {
      // Generate blueprint
      const result = await window.knuthflow.appintake.generateBlueprint(intake);
      if (!result.success || !result.blueprint) {
        setKickoffError(result.error || 'Failed to generate blueprint');
        return;
      }

      setGeneratedBlueprint(result.blueprint);
      setKickoffState('review');
    } catch (error) {
      setKickoffError(error instanceof Error ? error.message : 'Failed to generate blueprint');
    } finally {
      setIsKickoffSubmitting(false);
    }
  }, [workspace]);

  const handleBlueprintEdit = useCallback(() => {
    setKickoffDraft((currentDraft) => currentDraft ?? generatedBlueprint?.intake ?? null);
    setKickoffState('intake');
    setKickoffError(null);
  }, [generatedBlueprint]);

  const handleBlueprintApprove = useCallback(async () => {
    if (!workspace || !generatedBlueprint) return;

    setIsKickoffSubmitting(true);

    try {
      // Write blueprint files to workspace
      const writeResult = await window.knuthflow.appintake.writeBlueprintFiles(
        workspace.path,
        generatedBlueprint
      );

      if (!writeResult.success) {
        setKickoffError(writeResult.error || 'Failed to write blueprint files');
        return;
      }

      // Bootstrap Ralph in the workspace
      const bootstrapResult = await window.knuthflow.ralph.bootstrap(workspace.id, workspace.path, false);
      if (!bootstrapResult.success) {
        setKickoffError(bootstrapResult.error || 'Failed to bootstrap Ralph');
        return;
      }

      setKickoffState('approved');

      // Reload workspace context
      await loadWorkspaceContext();
      await loadRuns();
    } catch (error) {
      setKickoffError(error instanceof Error ? error.message : 'Failed to finalize blueprint');
    } finally {
      setIsKickoffSubmitting(false);
    }
  }, [workspace, generatedBlueprint, loadWorkspaceContext, loadRuns]);

  const handleKickoffCancel = useCallback(() => {
    setKickoffState('idle');
    setKickoffDraft(null);
    setGeneratedBlueprint(null);
    setKickoffError(null);
  }, []);

  const handleBootstrap = useCallback(async (force = false) => {
    if (!workspace) return;

    setWorkspaceActionState(force ? 'repair' : 'bootstrap');
    setWorkspaceNotice(null);

    try {
      const result = await window.knuthflow.ralph.bootstrap(workspace.id, workspace.path, force);
      if (!result.success) {
        setWorkspaceNotice({
          tone: 'error',
          message: result.error || 'Unable to bootstrap Ralph for this workspace.',
        });
        return;
      }

      setWorkspaceNotice({
        tone: 'info',
        message: formatBootstrapResult(result),
      });
      await Promise.all([loadWorkspaceContext(), loadRuns()]);
    } catch (error) {
      setWorkspaceNotice({
        tone: 'error',
        message: error instanceof Error ? error.message : 'Unable to bootstrap Ralph for this workspace.',
      });
    } finally {
      setWorkspaceActionState(null);
    }
  }, [loadRuns, loadWorkspaceContext, workspace]);

  const handleStartLoop = useCallback(async () => {
    if (!workspace) return;

    setWorkspaceActionState('start');
    setWorkspaceNotice(null);

    try {
      const validation = await window.knuthflow.ralph.validateBeforeStart(workspace.id, workspace.path);
      if (!validation.valid) {
        setWorkspaceNotice({
          tone: 'error',
          message: validation.issues[0]?.message || 'Ralph is not ready to start from this workspace.',
        });
        return;
      }

      const project = workspaceProject ?? await window.knuthflow.ralph.getProject(workspace.id);
      if (!project) {
        setWorkspaceNotice({
          tone: 'error',
          message: 'Bootstrap Ralph for this workspace before starting a loop.',
        });
        return;
      }

      const runName = `Ralph ${new Date().toLocaleTimeString()}`;
      const launch = await onLaunchClaudeSession({ name: runName, workspace });
      if (!launch.success || !launch.sessionRecordId || !launch.ptySessionId) {
        setWorkspaceNotice({
          tone: 'error',
          message: launch.error || 'Claude session failed to start for Ralph.',
        });
        return;
      }

      const runtimeResult = await window.knuthflow.ralphRuntime?.start(
        project.id,
        runName,
        launch.sessionRecordId,
        launch.ptySessionId,
      );

      if (!runtimeResult?.success || !runtimeResult.run) {
        if (launch.claudeRunId) {
          await window.knuthflow.claude.kill(launch.claudeRunId);
        }

        if (launch.sessionRecordId) {
          await window.knuthflow.session.updateEnd(launch.sessionRecordId, 'failed', null, null);
        }

        setWorkspaceNotice({
          tone: 'error',
          message: runtimeResult?.error || 'Ralph runtime failed to register the new run.',
        });
        return;
      }

      const nextRuns = await loadRuns();
      await loadWorkspaceContext();

      const nextSelectedRun = nextRuns.find((run) => run.runId === runtimeResult.run?.id) ?? null;
      if (nextSelectedRun) {
        handleSelectRun(nextSelectedRun);
      }

      setWorkspaceNotice({
        tone: 'info',
        message: `${runName} started from ${workspace.name}.`,
      });
    } catch (error) {
      setWorkspaceNotice({
        tone: 'error',
        message: error instanceof Error ? error.message : 'Unable to start Ralph from this workspace.',
      });
    } finally {
      setWorkspaceActionState(null);
    }
  }, [handleSelectRun, loadRuns, loadWorkspaceContext, onLaunchClaudeSession, workspace, workspaceProject]);

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

    try {
      switch (action) {
        case 'pause':
          await window.knuthflow.ralph.pauseRun(selectedRun.runId);
          break;
        case 'resume':
          await window.knuthflow.ralph.resumeRun(selectedRun.runId);
          break;
        default:
          return;
      }

      const nextRuns = await loadRuns();
      const nextSelectedRun = nextRuns.find((run) => run.runId === selectedRun.runId);
      if (nextSelectedRun) {
        await loadSelectedRunDetails(nextSelectedRun);
      }
      await loadWorkspaceContext();
    } catch (error) {
      console.error(`Failed to ${action} run:`, error);
      setWorkspaceNotice({
        tone: 'error',
        message: error instanceof Error ? error.message : `Unable to ${action} this Ralph run.`,
      });
    }
  }, [loadRuns, loadSelectedRunDetails, loadWorkspaceContext, selectedRun]);

  const handleConfirm = useCallback(async () => {
    if (!pendingConfirmation || !selectedRun) return;

    try {
      if (pendingConfirmation.action === 'stop') {
        await window.knuthflow.ralph.stopRun(selectedRun.runId);

        if (selectedRun.ptySessionId) {
          await window.knuthflow.pty.kill(selectedRun.ptySessionId, 'SIGTERM');
        }

        if (selectedRun.sessionId) {
          await window.knuthflow.session.updateEnd(selectedRun.sessionId, 'completed', null, null);
        }
      }

      setPendingConfirmation(null);

      const nextRuns = await loadRuns();
      const nextSelectedRun = nextRuns.find((run) => run.runId === selectedRun.runId) ?? null;
      if (nextSelectedRun) {
        await loadSelectedRunDetails(nextSelectedRun);
      } else {
        setSelectedRun(null);
        setTimelineEvents([]);
        setArtifacts([]);
        setFixPlanTasks([]);
        setLoopSummaries([]);
        setPlanSnapshots([]);
      }

      await loadWorkspaceContext();
    } catch (error) {
      console.error(`Failed to ${pendingConfirmation.action}:`, error);
      setWorkspaceNotice({
        tone: 'error',
        message: error instanceof Error ? error.message : `Unable to ${pendingConfirmation.action} this Ralph run.`,
      });
    }
  }, [loadRuns, loadSelectedRunDetails, loadWorkspaceContext, pendingConfirmation, selectedRun]);

  useEffect(() => {
    loadRunsRef.current = loadRuns;
    loadSelectedRunDetailsRef.current = loadSelectedRunDetails;
  }, [loadRuns, loadSelectedRunDetails]);

  useEffect(() => {
    void loadRunsRef.current?.();
  }, []);

  useEffect(() => {
    void loadWorkspaceContext();
  }, [loadWorkspaceContext]);

  useEffect(() => {
    selectedRunRef.current = selectedRun;
    selectedRunIdRef.current = selectedRun?.runId ?? null;
  }, [selectedRun]);

  useEffect(() => {
    const interval = setInterval(async () => {
      const currentRunId = selectedRunIdRef.current;
      if (currentRunId && selectedRunRef.current?.status === 'running') {
        const nextRuns = await loadRunsRef.current?.();
        const nextSelectedRun = nextRuns?.find((run) => run.runId === currentRunId);
        if (nextSelectedRun) {
          await loadSelectedRunDetailsRef.current?.(nextSelectedRun);
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

  const workspaceBadge = getReadinessBadge(workspaceReadiness);
  const activeWorkspaceRun = activeWorkspaceRuns.find((run) => run.status === 'running') ?? null;
  const canStartLoop = Boolean(
    workspace &&
    workspaceReadiness?.ready &&
    workspaceProject &&
    !activeWorkspaceRun &&
    workspaceActionState === null,
  );

  return (
    <div className="section-shell">
      <div className="section-header">
        <div>
          <h2 className="section-title">Ralph Console</h2>
          <p className="section-lead">Bootstrap a workspace, edit Ralph control files, and supervise active loop runs.</p>
        </div>
        <div className="toolbar-inline">
          <span className="badge badge-neutral">{runs.length} runs</span>
          <button onClick={() => void loadRuns()} disabled={isRefreshing} className="btn">
            {isRefreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>

      <div className="list-pane !pb-0">
        <div className="surface-panel-muted p-5">
          {workspace ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="metric-label">Workspace</p>
                  <h3 className="m-0 text-lg font-semibold">{workspace.name}</h3>
                  <p className="mt-2 text-sm text-muted text-mono">{workspace.path}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={workspaceBadge.className}>{workspaceBadge.label}</span>
                  {activeWorkspaceRun && <span className="badge badge-info">Run Active</span>}
                  {workspaceProject && <span className="badge badge-neutral text-mono">{workspaceProject.id.slice(0, 12)}…</span>}
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => void handleStartKickoff()}
                  disabled={!workspace || kickoffState !== 'idle'}
                  className="btn btn-primary"
                >
                  New App
                </button>
                <button
                  onClick={() => void handleStartLoop()}
                  disabled={!canStartLoop}
                  className="btn btn-primary"
                >
                  {workspaceActionState === 'start' ? 'Starting…' : 'Start Loop'}
                </button>
                <button
                  onClick={() => void handleBootstrap(false)}
                  disabled={!workspace || workspaceActionState !== null}
                  className="btn"
                >
                  {workspaceActionState === 'bootstrap' ? 'Bootstrapping…' : 'Bootstrap Ralph'}
                </button>
                <button
                  onClick={() => void handleBootstrap(true)}
                  disabled={!workspace || workspaceActionState !== null}
                  className="btn"
                >
                  {workspaceActionState === 'repair' ? 'Repairing…' : 'Repair Files'}
                </button>
                <button onClick={() => openControlFile('PROMPT.md')} disabled={!workspace} className="btn btn-ghost">
                  Edit Prompt
                </button>
                <button onClick={() => openControlFile('AGENT.md')} disabled={!workspace} className="btn btn-ghost">
                  Edit Agent
                </button>
                <button onClick={() => openControlFile('fix_plan.md')} disabled={!workspace} className="btn btn-ghost">
                  Edit Fix Plan
                </button>
              </div>

              <div className="grid gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]">
                <div className="surface-panel-inset p-4">
                  <p className="metric-label">Readiness</p>
                  <p className="m-0 text-sm text-muted">{summarizeIssues(workspaceReadiness)}</p>
                  {workspaceReadiness && workspaceReadiness.issues.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {workspaceReadiness.issues.slice(0, 3).map((issue) => (
                        <div key={`${issue.code}-${issue.message}`} className="list-card !cursor-default">
                          <div className="min-w-0 flex-1">
                            <div className="mb-2 flex flex-wrap items-center gap-2">
                              <span className={issue.severity === 'error' ? 'badge badge-danger' : issue.severity === 'warning' ? 'badge badge-warning' : 'badge badge-info'}>
                                {issue.severity}
                              </span>
                              <h4 className="list-card-title">{issue.message}</h4>
                            </div>
                            <p className="m-0 text-sm text-muted">{issue.recovery}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="surface-panel-inset p-4">
                  <p className="metric-label">Workspace Actions</p>
                  <div className="mt-3 space-y-2 text-sm text-muted">
                    <p className="m-0">Bootstrap creates `PROMPT.md`, `AGENT.md`, `fix_plan.md`, `specs/`, and `.ralph`.</p>
                    <p className="m-0">Start Loop opens a Claude session in this repository and registers a Ralph run in the console.</p>
                    {activeWorkspaceRun && (
                      <p className="m-0 text-[var(--text-primary)]">
                        Active run: <strong>{activeWorkspaceRun.name}</strong>
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {workspaceNotice && (
                <div className={`surface-panel-inset px-4 py-3 ${workspaceNotice.tone === 'error' ? 'border-[var(--danger)]' : 'border-[var(--info)]'}`}>
                  <p className={`m-0 text-sm ${workspaceNotice.tone === 'error' ? 'text-red-300' : 'text-[var(--text-primary)]'}`}>
                    {workspaceNotice.message}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="empty-state !min-h-0">
              <div>
                <h3 className="text-lg font-semibold">Choose a workspace first</h3>
                <p className="mt-2 text-sm text-muted">Ralph starts from the currently selected repository, not from the global run list.</p>
              </div>
            </div>
          )}

          {/* Kickoff Workflow (Phase 13) */}
          {(kickoffState === 'intake' || kickoffState === 'review' || kickoffState === 'approved') && (
            <KickoffErrorBoundary onReset={handleKickoffCancel}>
              {kickoffState === 'intake' && (
                <div className="kickoff-intake">
                  <AppIntakeForm
                    onSubmit={handleIntakeSubmit}
                    onCancel={handleKickoffCancel}
                    isSubmitting={isKickoffSubmitting}
                    initialData={kickoffDraft ?? generatedBlueprint?.intake}
                  />
                  {kickoffError && (
                    <div className="mt-4 p-4 border border-red-500 rounded">
                      <p className="text-red-300">{kickoffError}</p>
                    </div>
                  )}
                </div>
              )}

              {kickoffState === 'review' && generatedBlueprint && (
                <div className="kickoff-review">
                  <BlueprintReview
                    blueprint={generatedBlueprint}
                    onApprove={handleBlueprintApprove}
                    onEditIntake={handleBlueprintEdit}
                    onCancel={handleKickoffCancel}
                    isApproved={false}
                    isSubmitting={isKickoffSubmitting}
                  />
                  {kickoffError && (
                    <div className="mt-4 p-4 border border-red-500 rounded">
                      <p className="text-red-300">{kickoffError}</p>
                    </div>
                  )}
                </div>
              )}

              {kickoffState === 'approved' && (
                <div className="kickoff-approved p-6">
                  <div className="text-center">
                    <span className="badge badge-success text-lg py-3 px-4">Blueprint Approved</span>
                    <h3 className="text-xl font-semibold mt-4">Your app is ready to build!</h3>
                    <p className="mt-2 text-muted">
                      The blueprint has been written to the workspace. Start the Ralph loop when ready.
                    </p>
                    <button
                      onClick={() => setKickoffState('idle')}
                      className="btn btn-primary mt-4"
                    >
                      Start Building
                    </button>
                  </div>
                </div>
              )}
            </KickoffErrorBoundary>
          )}
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
                    <p className="mt-2 text-sm text-muted">Bootstrap the current workspace, then start a loop to populate the console.</p>
                  </div>
                </div>
              ) : runs.map((run) => (
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
                  <span className={getRunStatusBadge(selectedRun.status)}>
                    {selectedRun.status}
                  </span>
                  <span className="badge badge-neutral">{selectedRun.phase}</span>
                </div>
              </div>

              <div className="px-4 pb-3">
                <div className="segmented-control">
                  {tabs.map((tab) => (
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
                      const artifact = artifacts.find((item) => item.itemId === summaryId);
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
                    onDismiss={(id) => setAlerts((prev) => prev.filter((alert) => alert.id !== id))}
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
