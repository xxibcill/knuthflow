import { getDatabase } from '../database';
import type {
  MilestoneState,
  MilestoneTask,
  MilestoneScheduleResult,
  MilestoneSnapshot,
  CompressedContext,
  MilestoneFeedback,
  PlanTask,
  AcceptanceGate,
} from '../../shared/ralphTypes';
import { parsePlanContent } from './planParser';
import { extractPriority } from './planParser';

// ─────────────────────────────────────────────────────────────────────────────
// Milestone Controller
// Phase 14: Long-Horizon App Builder - Milestone-Aware Execution
// ─────────────────────────────────────────────────────────────────────────────

export interface MilestoneControllerConfig {
  maxContextLength?: number;
  snapshotInterval?: number;
}

const DEFAULT_CONFIG: Required<MilestoneControllerConfig> = {
  maxContextLength: 8000,
  snapshotInterval: 5, // snapshot every N iterations
};

/**
 * MilestoneController manages milestone-aware execution with task graph,
 * dependency tracking, and persisted milestone state.
 */
export class MilestoneController {
  private db = getDatabase();
  private config: Required<MilestoneControllerConfig>;

  constructor(config: MilestoneControllerConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Initialization
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Initialize milestone state from a blueprint's milestones.
   * Called at the start of a new run.
   */
  initializeFromBlueprint(
    projectId: string,
    runId: string,
    milestones: Array<{
      id: string;
      title: string;
      description: string;
      tasks: string[];
      acceptanceGate: string;
      order: number;
    }>
  ): MilestoneState[] {
    const createdMilestones: MilestoneState[] = [];

    for (const milestone of milestones) {
      const existing = this.db.getMilestoneStateByMilestoneId(projectId, runId, milestone.id);
      if (existing) {
        createdMilestones.push(existing);
        continue;
      }

      const state = this.db.createMilestoneState({
        projectId,
        runId,
        milestoneId: milestone.id,
        title: milestone.title,
        description: milestone.description,
        acceptanceGate: milestone.acceptanceGate,
        order: milestone.order,
        tasks: milestone.tasks,
      });
      createdMilestones.push(state);
    }

    return createdMilestones;
  }

  /**
   * Initialize task graph from parsed fix_plan.md tasks.
   * Builds dependency relationships based on task structure.
   */
  initializeTaskGraph(
    projectId: string,
    runId: string,
    planTasks: PlanTask[],
    milestoneMap: Map<string, string> // taskId -> milestoneId
  ): MilestoneTask[] {
    const createdTasks: MilestoneTask[] = [];

    for (const task of planTasks) {
      const existing = this.db.getMilestoneTaskByTaskId(projectId, runId, task.id);
      if (existing) {
        createdTasks.push(existing);
        continue;
      }

      // Find parent task if any (dependency)
      const dependencies: string[] = [];
      if (task.parentId) {
        dependencies.push(task.parentId);
      }

      // Find sibling tasks that come before (dependency on earlier siblings)
      const milestoneId = milestoneMap.get(task.id) ?? '';

      const mTask = this.db.createMilestoneTask({
        projectId,
        runId,
        milestoneId,
        taskId: task.id,
        title: task.title,
        priority: extractPriority(task.title),
        dependencies,
      });
      createdTasks.push(mTask);
    }

    return createdTasks;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Milestone State Management
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Get all milestone states for a run
   */
  getMilestones(projectId: string, runId: string): MilestoneState[] {
    return this.db.listMilestoneStates(projectId, runId);
  }

  /**
   * Get a specific milestone state
   */
  getMilestone(projectId: string, runId: string, milestoneId: string): MilestoneState | null {
    return this.db.getMilestoneStateByMilestoneId(projectId, runId, milestoneId);
  }

  /**
   * Get current active milestone (first non-completed, non-failed milestone)
   */
  getActiveMilestone(projectId: string, runId: string): MilestoneState | null {
    const milestones = this.db.listMilestoneStates(projectId, runId);
    return (
      milestones.find(m => m.status === 'in_progress') ||
      milestones.find(m => m.status === 'pending')
    ) ?? null;
  }

  /**
   * Start a milestone (transition from pending to in_progress)
   */
  startMilestone(projectId: string, runId: string, milestoneId: string): MilestoneState | null {
    const milestone = this.db.getMilestoneStateByMilestoneId(projectId, runId, milestoneId);
    if (!milestone) return null;

    if (milestone.status !== 'pending') return null;

    this.db.updateMilestoneState(milestone.id, {
      status: 'in_progress',
      startedAt: Date.now(),
    });

    return this.db.getMilestoneState(milestone.id);
  }

  /**
   * Complete a milestone with validation result
   */
  completeMilestone(
    projectId: string,
    runId: string,
    milestoneId: string,
    validationResult: MilestoneState['validationResult']
  ): MilestoneState | null {
    const milestone = this.db.getMilestoneStateByMilestoneId(projectId, runId, milestoneId);
    if (!milestone) return null;

    const status = validationResult?.passed ? 'completed' : 'failed';

    this.db.updateMilestoneState(milestone.id, {
      status,
      completedAt: Date.now(),
      validationResult,
    });

    return this.db.getMilestoneState(milestone.id);
  }

  /**
   * Block a milestone (when dependencies aren't met)
   */
  blockMilestone(projectId: string, runId: string, milestoneId: string, blockedTasks: string[]): void {
    const milestone = this.db.getMilestoneStateByMilestoneId(projectId, runId, milestoneId);
    if (!milestone) return;

    this.db.updateMilestoneState(milestone.id, {
      status: 'blocked',
      blockedTasks,
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Task Graph Operations
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Get all tasks in the task graph for a run
   */
  getTaskGraph(projectId: string, runId: string): MilestoneTask[] {
    return this.db.listMilestoneTasks(projectId, runId);
  }

  /**
   * Get tasks for a specific milestone
   */
  getMilestoneTasks(projectId: string, runId: string, milestoneId: string): MilestoneTask[] {
    return this.db.listMilestoneTasksByMilestone(projectId, runId, milestoneId);
  }

  /**
   * Get a specific task
   */
  getTask(projectId: string, runId: string, taskId: string): MilestoneTask | null {
    return this.db.getMilestoneTaskByTaskId(projectId, runId, taskId);
  }

  /**
   * Mark a task as selected (in_progress)
   */
  selectTask(projectId: string, runId: string, taskId: string): MilestoneTask | null {
    const task = this.db.getMilestoneTaskByTaskId(projectId, runId, taskId);
    if (!task) return null;

    if (task.status !== 'pending') return null;

    this.db.updateMilestoneTask(task.id, {
      status: 'in_progress',
      selectedAt: Date.now(),
    });

    return this.db.getMilestoneTask(task.id);
  }

  /**
   * Mark a task as completed
   */
  completeTask(projectId: string, runId: string, taskId: string): MilestoneTask | null {
    const task = this.db.getMilestoneTaskByTaskId(projectId, runId, taskId);
    if (!task) return null;

    this.db.updateMilestoneTask(task.id, {
      status: 'completed',
      completedAt: Date.now(),
    });

    // Update milestone's completed tasks
    const milestone = this.db.getMilestoneState(task.milestoneId);
    if (milestone) {
      const completedTasks = [...milestone.completedTasks, taskId];
      this.db.updateMilestoneState(milestone.id, { completedTasks });
    }

    return this.db.getMilestoneTask(task.id);
  }

  /**
   * Check if a task's dependencies are all completed
   */
  areDependenciesMet(projectId: string, runId: string, taskId: string): { met: boolean; blockedBy: string[] } {
    const task = this.db.getMilestoneTaskByTaskId(projectId, runId, taskId);
    if (!task) return { met: false, blockedBy: [] };

    const blockedBy: string[] = [];
    for (const depId of task.dependencies) {
      const depTask = this.db.getMilestoneTaskByTaskId(projectId, runId, depId);
      if (!depTask || depTask.status !== 'completed') {
        blockedBy.push(depId);
      }
    }

    return { met: blockedBy.length === 0, blockedBy };
  }

  /**
   * Block a task due to unmet dependencies
   */
  blockTask(projectId: string, runId: string, taskId: string, reason: string): MilestoneTask | null {
    const task = this.db.getMilestoneTaskByTaskId(projectId, runId, taskId);
    if (!task) return null;

    this.db.updateMilestoneTask(task.id, {
      status: 'blocked',
      blockedReason: reason,
    });

    return this.db.getMilestoneTask(task.id);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Scheduling - Dependency-Aware Task Selection
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Select the next available task based on:
   * 1. Dependency readiness (only select tasks whose deps are met)
   * 2. Milestone priority (active milestone first)
   * 3. Task priority within milestone
   */
  selectNextTask(projectId: string, runId: string): MilestoneScheduleResult {
    const pendingTasks = this.db.listPendingMilestoneTasks(projectId, runId);
    const availableTasks: MilestoneTask[] = [];
    const blockedTasks: MilestoneTask[] = [];

    // Separate available from blocked
    for (const task of pendingTasks) {
      const { met } = this.areDependenciesMet(projectId, runId, task.taskId);
      if (met) {
        availableTasks.push(task);
      } else {
        blockedTasks.push(task);
      }
    }

    if (availableTasks.length === 0) {
      return {
        selectedTask: null,
        milestone: null,
        reason: 'No available tasks - all pending tasks are blocked by dependencies',
        availableTasks: [],
        blockedTasks,
      };
    }

    // Get milestone priorities
    const milestones = this.db.listMilestoneStates(projectId, runId);
    const milestonePriority = new Map<string, number>();
    for (const m of milestones) {
      milestonePriority.set(m.milestoneId, m.order);
    }

    // Sort by: 1) active/in_progress milestone first, 2) then by priority
    const activeMilestone = this.getActiveMilestone(projectId, runId);

    availableTasks.sort((a, b) => {
      // Active milestone tasks get highest priority
      if (activeMilestone) {
        const aIsActive = a.milestoneId === activeMilestone.milestoneId ? 0 : 1;
        const bIsActive = b.milestoneId === activeMilestone.milestoneId ? 0 : 1;
        if (aIsActive !== bIsActive) return aIsActive - bIsActive;
      }

      // Then by milestone order
      const aOrder = milestonePriority.get(a.milestoneId) ?? 999;
      const bOrder = milestonePriority.get(b.milestoneId) ?? 999;
      if (aOrder !== bOrder) return aOrder - bOrder;

      // Then by task priority
      return a.priority - b.priority;
    });

    const selectedTask = availableTasks[0];
    const milestone = selectedTask.milestoneId
      ? milestones.find(m => m.milestoneId === selectedTask.milestoneId) ?? null
      : null;

    // Mark as selected
    this.selectTask(projectId, runId, selectedTask.taskId);

    return {
      selectedTask: this.db.getMilestoneTaskByTaskId(projectId, runId, selectedTask.taskId),
      milestone,
      reason: `Selected task "${selectedTask.title}" from milestone "${milestone?.title ?? 'unassigned'}"`,
      availableTasks,
      blockedTasks,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Snapshot and Resume
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Create a milestone snapshot for recovery
   */
  createSnapshot(projectId: string, runId: string, iteration: number): MilestoneSnapshot {
    const milestones = this.db.listMilestoneStates(projectId, runId);
    const taskGraph = this.db.listMilestoneTasks(projectId, runId);

    return this.db.createMilestoneSnapshot({
      projectId,
      runId,
      iteration,
      milestones,
      taskGraph,
      compressedContext: null, // Compressed context is created separately
    });
  }

  /**
   * Get the latest snapshot for a run
   */
  getLatestSnapshot(runId: string): MilestoneSnapshot | null {
    return this.db.getLatestMilestoneSnapshot(runId);
  }

  /**
   * Resume from a snapshot - restore milestone and task state
   */
  resumeFromSnapshot(snapshot: MilestoneSnapshot): {
    milestones: MilestoneState[];
    taskGraph: MilestoneTask[];
  } {
    // The state is already in the database from the snapshot,
    // this just returns the data for the caller to use
    return {
      milestones: snapshot.milestones,
      taskGraph: snapshot.taskGraph,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Context Compression (for P14-T2)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Create a compressed context for bounded prompt
   */
  createCompressedContext(
    projectId: string,
    runId: string,
    productIntent: string,
    currentArchitecture: string,
    recentChanges: string
  ): CompressedContext {
    const milestones = this.db.listMilestoneStates(projectId, runId);
    const openMilestones = milestones
      .filter(m => m.status !== 'completed' && m.status !== 'failed')
      .map(m => m.title);

    const pendingTasks = this.db.listPendingMilestoneTasks(projectId, runId);
    const blockedTasks = pendingTasks.filter(t => t.status === 'blocked');
    const blockers = blockedTasks.map(t => `${t.title}: ${t.blockedReason}`);

    const context: CompressedContext = {
      productIntent,
      currentArchitecture,
      recentChanges,
      blockers: blockers.slice(0, 5), // Limit to 5 blockers
      openMilestones,
      boundedPrompt: this.buildBoundedPrompt(productIntent, milestones, pendingTasks),
      compressedAt: Date.now(),
    };

    return context;
  }

  /**
   * Build a bounded prompt from compressed context
   */
  private buildBoundedPrompt(
    productIntent: string,
    milestones: MilestoneState[],
    pendingTasks: MilestoneTask[]
  ): string {
    const lines: string[] = [
      `# App Goal`,
      productIntent,
      '',
      `# Milestones`,
    ];

    for (const m of milestones) {
      lines.push(`## ${m.order}. ${m.title} [${m.status}]`);
      if (m.status === 'in_progress') {
        const mTasks = pendingTasks.filter(t => t.milestoneId === m.milestoneId);
        lines.push('Tasks:');
        for (const t of mTasks.slice(0, 5)) {
          lines.push(`- ${t.title} (${t.status})`);
        }
      }
      lines.push('');
    }

    const prompt = lines.join('\n');
    return prompt.slice(0, this.config.maxContextLength);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Feedback (for P14-T3)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Record feedback for a milestone
   */
  recordFeedback(params: {
    projectId: string;
    runId: string;
    milestoneId: string;
    taskId?: string | null;
    type: 'accept' | 'reject' | 'rework' | 'rollback' | 'replan';
    reason: string;
    evidence: string;
    suggestedAction?: string | null;
  }): MilestoneFeedback {
    return this.db.createMilestoneFeedback(params);
  }

  /**
   * Get feedback history for a milestone
   */
  getFeedback(projectId: string, runId: string, milestoneId?: string): MilestoneFeedback[] {
    if (milestoneId) {
      return this.db.listMilestoneFeedbackByMilestone(projectId, runId, milestoneId);
    }
    return this.db.listMilestoneFeedback(projectId, runId);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Singleton
// ─────────────────────────────────────────────────────────────────────────────

let instance: MilestoneController | null = null;

export function getMilestoneController(): MilestoneController {
  if (!instance) {
    instance = new MilestoneController();
  }
  return instance;
}

export function resetMilestoneController(): void {
  instance = null;
}
