import * as path from 'path';
import {
  PlanTask,
  ScheduledItem,
  AcceptanceGate,
} from '../shared/ralphTypes';

import { validateWorkspacePath } from './ralph/planPathValidator';
import {
  parseFixPlan,
  parsePlanContent,
  parseTaskLine,
  getIndent,
  checkboxToStatus,
  extractPriority,
  generateTaskId,
  flattenTasks,
} from './ralph/planParser';
import { findTaskById } from './ralph/taskFinder';
import { selectNextItem, getPendingItems } from './ralph/taskSelector';
import { completeItem, deferItem } from './ralph/taskUpdater';
import { determineAcceptanceGate, updateAcceptanceGate } from './ralph/acceptanceGates';
import { shouldSplitTask, createIncrementalSubTask } from './ralph/oversizedTaskHandler';

// ─────────────────────────────────────────────────────────────────────────────
// Ralph Scheduler - One-Item Task Selection
// ─────────────────────────────────────────────────────────────────────────────

export class RalphScheduler {
  private workspacePath: string;
  private cachedTasks: PlanTask[] | null = null;

  constructor(workspacePath: string) {
    // Normalize path to prevent duplicates from different path representations
    const normalizedPath = path.normalize(workspacePath);
    // Validate workspace path to prevent path traversal
    if (!validateWorkspacePath(normalizedPath)) {
      throw new Error(`Invalid workspace path: ${normalizedPath}`);
    }
    this.workspacePath = normalizedPath;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Plan File Parsing
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Parse fix_plan.md and extract tasks
   */
  parseFixPlan(): PlanTask[] {
    const result = parseFixPlan(this.workspacePath, this.cachedTasks);
    this.cachedTasks = result.cachedTasks;
    return result.tasks;
  }

  /**
   * Parse plan markdown content into tasks
   */
  parsePlanContent(content: string): PlanTask[] {
    const tasks = parsePlanContent(content);
    this.cachedTasks = tasks;
    return tasks;
  }

  /**
   * Get cached tasks for indent calculation
   */
  getCachedTasks(): PlanTask[] | null {
    return this.cachedTasks;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Task Selection
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Select the highest-priority incomplete task
   */
  selectNextItem(): ScheduledItem | null {
    return selectNextItem(this.workspacePath, () => ({
      tasks: this.parseFixPlan(),
      cachedTasks: this.cachedTasks,
    }));
  }

  /**
   * Get all flattened pending tasks
   */
  getPendingItems(): ScheduledItem[] {
    return getPendingItems(this.workspacePath, () => ({
      tasks: this.parseFixPlan(),
      cachedTasks: this.cachedTasks,
    }));
  }

  /**
   * Flatten nested tasks into a single array
   */
  flattenTasks(tasks: PlanTask[]): PlanTask[] {
    return flattenTasks(tasks);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Task Updates
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Mark a task as completed in fix_plan.md
   */
  completeItem(itemId: string): boolean {
    const result = completeItem(
      this.workspacePath,
      itemId,
      findTaskById,
      () => ({
        tasks: this.parseFixPlan(),
        cachedTasks: this.cachedTasks,
      })
    );
    if (result) {
      this.cachedTasks = null; // Invalidate cache
    }
    return result;
  }

  /**
   * Defer a task (mark as skipped for now)
   */
  deferItem(itemId: string, reason?: string): boolean {
    const result = deferItem(
      this.workspacePath,
      itemId,
      reason,
      findTaskById,
      () => ({
        tasks: this.parseFixPlan(),
        cachedTasks: this.cachedTasks,
      })
    );
    if (result) {
      this.cachedTasks = null;
    }
    return result;
  }

  /**
   * Find a task by ID in the task tree
   */
  findTaskById(tasks: PlanTask[], id: string): PlanTask | null {
    return findTaskById(tasks, id);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Oversized Task Handling
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Check if a task should be split into smaller increments
   */
  shouldSplitTask(item: ScheduledItem): boolean {
    return shouldSplitTask(item, () => ({
      tasks: this.parseFixPlan(),
      cachedTasks: this.cachedTasks,
    }));
  }

  /**
   * Create an incremental sub-task for oversized tasks
   */
  createIncrementalSubTask(item: ScheduledItem, incrementNumber: number, totalIncrements: number): ScheduledItem {
    return createIncrementalSubTask(item, incrementNumber, totalIncrements);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Acceptance Gate
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Determine acceptance gate for a selected item
   * Uses word boundary matching for more accurate detection
   */
  determineAcceptanceGate(item: ScheduledItem): AcceptanceGate | null {
    return determineAcceptanceGate(item);
  }

  /**
   * Update acceptance gate for an item
   */
  updateAcceptanceGate(itemId: string, gate: AcceptanceGate): boolean {
    return updateAcceptanceGate(
      this.workspacePath,
      itemId,
      gate,
      findTaskById,
      () => ({
        tasks: this.parseFixPlan(),
        cachedTasks: this.cachedTasks,
      })
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Singleton cache
// ─────────────────────────────────────────────────────────────────────────────

const schedulerInstances: Map<string, RalphScheduler> = new Map();

export function getRalphScheduler(workspacePath: string): RalphScheduler {
  let scheduler = schedulerInstances.get(workspacePath);
  if (!scheduler) {
    scheduler = new RalphScheduler(workspacePath);
    schedulerInstances.set(workspacePath, scheduler);
  }
  return scheduler;
}

export function getAllRalphSchedulers(): Map<string, RalphScheduler> {
  return schedulerInstances;
}

export function resetRalphScheduler(workspacePath?: string): void {
  if (workspacePath) {
    schedulerInstances.delete(workspacePath);
  } else {
    schedulerInstances.clear();
  }
}
