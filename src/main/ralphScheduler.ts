import * as fs from 'fs';
import * as path from 'path';
import {
  PlanTask,
  ScheduledItem,
  AcceptanceGate,
} from '../shared/ralphTypes';

// ─────────────────────────────────────────────────────────────────────────────
// Ralph Scheduler - One-Item Task Selection
// ─────────────────────────────────────────────────────────────────────────────

export class RalphScheduler {
  private workspacePath: string;
  private cachedTasks: PlanTask[] | null = null;

  constructor(workspacePath: string) {
    this.workspacePath = workspacePath;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Plan File Parsing
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Parse fix_plan.md and extract tasks
   */
  parseFixPlan(): PlanTask[] {
    const fixPlanPath = path.join(this.workspacePath, 'fix_plan.md');

    if (!fs.existsSync(fixPlanPath)) {
      return [];
    }

    const content = fs.readFileSync(fixPlanPath, 'utf-8');
    return this.parsePlanContent(content);
  }

  /**
   * Parse plan markdown content into tasks
   */
  parsePlanContent(content: string): PlanTask[] {
    const lines = content.split('\n');
    const tasks: PlanTask[] = [];
    const stack: PlanTask[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const task = this.parseTaskLine(line, i + 1);

      if (task) {
        // Determine parent based on indentation
        while (stack.length > 0 && this.getIndent(task.lineNumber) <= this.getIndent(stack[stack.length - 1].lineNumber)) {
          stack.pop();
        }

        if (stack.length > 0) {
          task.parentId = stack[stack.length - 1].id;
          stack[stack.length - 1].children.push(task);
        }

        tasks.push(task);
        stack.push(task);
      }
    }

    this.cachedTasks = tasks;
    return tasks;
  }

  /**
   * Parse a single task line
   */
  private parseTaskLine(line: string, lineNumber: number): PlanTask | null {
    // Match checkbox patterns: "- [ ]", "- [x]", "- [X]", "* [ ]", "* [x]"
    const checkboxMatch = line.match(/^(\s*)-\s*\[([ xX])\]\s*(.+)$/);

    if (!checkboxMatch) {
      return null;
    }

    const [, indent, checkbox, title] = checkboxMatch;
    const status = this.checkboxToStatus(checkbox);

    // Parse priority from title (e.g., "HIGH: Fix bug" or "[P1] Task")
    const priority = this.extractPriority(title);

    return {
      id: `task-${lineNumber}-${this.hashString(title)}`,
      title: title.trim(),
      description: '', // Description would come from following lines
      status,
      checkbox: checkboxMatch[0],
      lineNumber,
      priority,
      children: [],
      parentId: null,
    };
  }

  /**
   * Get indentation level of a task line
   */
  private getIndent(lineNumber: number): number {
    // This is a simplified approach - in practice you'd track actual indentation
    return 0;
  }

  /**
   * Convert checkbox character to status
   */
  private checkboxToStatus(checkbox: string): 'pending' | 'completed' {
    return checkbox.toLowerCase() === 'x' ? 'completed' : 'pending';
  }

  /**
   * Extract priority from task title
   */
  private extractPriority(title: string): number {
    // Look for explicit priority markers
    const highMatch = title.match(/\b(HIGH|P0|P1)\b/i);
    if (highMatch) return 1;

    const medMatch = title.match(/\b(MED|MEDIUM|P2)\b/i);
    if (medMatch) return 2;

    const lowMatch = title.match(/\b(LOW|P3|P4)\b/i);
    if (lowMatch) return 3;

    // Default priority based on position (earlier = higher)
    return 2;
  }

  /**
   * Simple hash for generating task IDs
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Task Selection
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Select the highest-priority incomplete task
   */
  selectNextItem(): ScheduledItem | null {
    const tasks = this.parseFixPlan();
    const pendingTasks = this.flattenTasks(tasks).filter(t => t.status === 'pending');

    if (pendingTasks.length === 0) {
      return null;
    }

    // Sort by priority (lower number = higher priority)
    pendingTasks.sort((a, b) => a.priority - b.priority);

    const selected = pendingTasks[0];
    return {
      id: selected.id,
      title: selected.title,
      description: selected.description,
      status: 'in_progress',
      priority: selected.priority,
      metadata: {
        lineNumber: selected.lineNumber,
        parentId: selected.parentId,
      },
      selectedAt: Date.now(),
      completedAt: null,
    };
  }

  /**
   * Get all flattened pending tasks
   */
  getPendingItems(): ScheduledItem[] {
    const tasks = this.parseFixPlan();
    return this.flattenTasks(tasks)
      .filter(t => t.status === 'pending')
      .map(t => ({
        id: t.id,
        title: t.title,
        description: t.description,
        status: t.status,
        priority: t.priority,
        metadata: {
          lineNumber: t.lineNumber,
          parentId: t.parentId,
        },
        selectedAt: null,
        completedAt: null,
      }));
  }

  /**
   * Flatten nested tasks into a single array
   */
  flattenTasks(tasks: PlanTask[]): PlanTask[] {
    const result: PlanTask[] = [];
    for (const task of tasks) {
      result.push(task);
      if (task.children.length > 0) {
        result.push(...this.flattenTasks(task.children));
      }
    }
    return result;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Task Updates
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Mark a task as completed in fix_plan.md
   */
  completeItem(itemId: string): boolean {
    const tasks = this.parseFixPlan();
    const task = this.findTaskById(tasks, itemId);

    if (!task) {
      return false;
    }

    // Update the checkbox to completed
    const fixPlanPath = path.join(this.workspacePath, 'fix_plan.md');
    const content = fs.readFileSync(fixPlanPath, 'utf-8');
    const lines = content.split('\n');

    // Replace checkbox on the correct line
    if (task.lineNumber > 0 && task.lineNumber <= lines.length) {
      const line = lines[task.lineNumber - 1];
      lines[task.lineNumber - 1] = line.replace(/- \[ \]/, '- [x]');
      fs.writeFileSync(fixPlanPath, lines.join('\n'), 'utf-8');
    }

    this.cachedTasks = null; // Invalidate cache
    return true;
  }

  /**
   * Defer a task (mark as skipped for now)
   */
  deferItem(itemId: string, reason?: string): boolean {
    const tasks = this.parseFixPlan();
    const task = this.findTaskById(tasks, itemId);

    if (!task) {
      return false;
    }

    // Add deferral comment to the task
    const fixPlanPath = path.join(this.workspacePath, 'fix_plan.md');
    const content = fs.readFileSync(fixPlanPath, 'utf-8');
    const lines = content.split('\n');

    if (task.lineNumber > 0 && task.lineNumber <= lines.length) {
      const deferralNote = reason ? ` (DEFERRED: ${reason})` : ' (DEFERRED)';
      lines[task.lineNumber - 1] = lines[task.lineNumber - 1].trimEnd() + deferralNote;
      fs.writeFileSync(fixPlanPath, lines.join('\n'), 'utf-8');
    }

    this.cachedTasks = null;
    return true;
  }

  /**
   * Find a task by ID in the task tree
   */
  private findTaskById(tasks: PlanTask[], id: string): PlanTask | null {
    for (const task of tasks) {
      if (task.id === id) {
        return task;
      }
      if (task.children.length > 0) {
        const found = this.findTaskById(task.children, id);
        if (found) return found;
      }
    }
    return null;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Oversized Task Handling
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Check if a task should be split into smaller increments
   */
  shouldSplitTask(item: ScheduledItem): boolean {
    // Heuristics for oversized tasks:
    // 1. Title contains keywords like "refactor", "implement", "rewrite"
    // 2. Description is long
    // 3. Task has many child tasks

    const splitKeywords = ['refactor', 'implement', 'rewrite', 'redesign', 'overhaul'];
    const titleLower = item.title.toLowerCase();

    for (const keyword of splitKeywords) {
      if (titleLower.includes(keyword)) {
        return true;
      }
    }

    // Check for child tasks
    const tasks = this.parseFixPlan();
    const task = this.findTaskById(tasks, item.id);
    if (task && task.children.length > 3) {
      return true;
    }

    return false;
  }

  /**
   * Create an incremental sub-task for oversized tasks
   */
  createIncrementalSubTask(item: ScheduledItem, incrementNumber: number, totalIncrements: number): ScheduledItem {
    return {
      id: `${item.id}-inc-${incrementNumber}`,
      title: `[${incrementNumber}/${totalIncrements}] ${item.title}`,
      description: item.description,
      status: 'in_progress',
      priority: item.priority,
      metadata: {
        ...item.metadata,
        parentItemId: item.id,
        incrementNumber,
        totalIncrements,
        isIncremental: true,
      },
      selectedAt: Date.now(),
      completedAt: null,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Acceptance Gate
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Determine acceptance gate for a selected item
   */
  determineAcceptanceGate(item: ScheduledItem): AcceptanceGate | null {
    const titleLower = item.title.toLowerCase();

    // Test-related tasks
    if (titleLower.includes('test') || titleLower.includes('spec')) {
      return {
        type: 'test',
        description: `Run tests for: ${item.title}`,
        command: 'npm test',
        expectedExitCode: 0,
        timeoutMs: 120000,
      };
    }

    // Build-related tasks
    if (titleLower.includes('build') || titleLower.includes('compile')) {
      return {
        type: 'build',
        description: `Build project: ${item.title}`,
        command: 'npm run build',
        expectedExitCode: 0,
        timeoutMs: 180000,
      };
    }

    // Lint-related tasks
    if (titleLower.includes('lint') || titleLower.includes('format')) {
      return {
        type: 'test',
        description: `Lint code: ${item.title}`,
        command: 'npm run lint',
        expectedExitCode: 0,
        timeoutMs: 60000,
      };
    }

    // Default to manual verification
    return {
      type: 'manual',
      description: `Manual verification needed for: ${item.title}`,
    };
  }

  /**
   * Update acceptance gate for an item
   */
  updateAcceptanceGate(itemId: string, gate: AcceptanceGate): boolean {
    const tasks = this.parseFixPlan();
    const task = this.findTaskById(tasks, itemId);

    if (!task) {
      return false;
    }

    // Append gate info as a comment in the task
    const fixPlanPath = path.join(this.workspacePath, 'fix_plan.md');
    const content = fs.readFileSync(fixPlanPath, 'utf-8');
    const lines = content.split('\n');

    if (task.lineNumber > 0 && task.lineNumber <= lines.length) {
      const gateInfo = `\n  <!-- Acceptance: ${gate.type} - ${gate.description}${gate.command ? ` (${gate.command})` : ''} -->`;
      lines[task.lineNumber - 1] = lines[task.lineNumber - 1].trimEnd() + gateInfo;
      fs.writeFileSync(fixPlanPath, lines.join('\n'), 'utf-8');
    }

    return true;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Singleton cache
// ─────────────────────────────────────────────────────────────────────────────

let schedulerInstances: Map<string, RalphScheduler> = new Map();

export function getRalphScheduler(workspacePath: string): RalphScheduler {
  let scheduler = schedulerInstances.get(workspacePath);
  if (!scheduler) {
    scheduler = new RalphScheduler(workspacePath);
    schedulerInstances.set(workspacePath, scheduler);
  }
  return scheduler;
}

export function resetRalphScheduler(workspacePath?: string): void {
  if (workspacePath) {
    schedulerInstances.delete(workspacePath);
  } else {
    schedulerInstances.clear();
  }
}
