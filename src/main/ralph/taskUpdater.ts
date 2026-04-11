import * as fs from 'fs';
import * as path from 'path';
import type { PlanTask } from '../../shared/ralphTypes';

/**
 * Mark a task as completed in fix_plan.md
 */
export function completeItem(workspacePath: string, itemId: string, findTaskByIdFn: (tasks: PlanTask[], id: string) => PlanTask | null, parseFixPlan: () => { tasks: PlanTask[]; cachedTasks: PlanTask[] | null }): boolean {
  // Validate itemId format to prevent injection
  if (!itemId || typeof itemId !== 'string' || itemId.length > 200) {
    return false;
  }

  const { tasks } = parseFixPlan();
  const task = findTaskByIdFn(tasks, itemId);

  if (!task) {
    return false;
  }

  // Update the checkbox to completed
  const fixPlanPath = path.join(workspacePath, 'fix_plan.md');
  const content = fs.readFileSync(fixPlanPath, 'utf-8');
  const lines = content.split('\n');

  // Replace checkbox on the correct line
  if (task.lineNumber > 0 && task.lineNumber <= lines.length) {
    const line = lines[task.lineNumber - 1];
    // Replace any pending checkbox pattern (- [ ] or * [ ]) with completed (- [x])
    lines[task.lineNumber - 1] = line.replace(/^(\s*[*-])\s*\[\s*\]\s*/, '$1 [x] ');
    try {
      fs.writeFileSync(fixPlanPath, lines.join('\n'), 'utf-8');
    } catch {
      // File write failed, keep cache valid and return false
      return false;
    }
  }

  return true;
}

/**
 * Defer a task (mark as skipped for now)
 */
export function deferItem(workspacePath: string, itemId: string, reason: string | undefined, findTaskByIdFn: (tasks: PlanTask[], id: string) => PlanTask | null, parseFixPlan: () => { tasks: PlanTask[]; cachedTasks: PlanTask[] | null }): boolean {
  // Validate itemId format to prevent injection
  if (!itemId || typeof itemId !== 'string' || itemId.length > 200) {
    return false;
  }

  const { tasks } = parseFixPlan();
  const task = findTaskByIdFn(tasks, itemId);

  if (!task) {
    return false;
  }

  // Add deferral comment to the task
  const fixPlanPath = path.join(workspacePath, 'fix_plan.md');
  const content = fs.readFileSync(fixPlanPath, 'utf-8');
  const lines = content.split('\n');

  if (task.lineNumber > 0 && task.lineNumber <= lines.length) {
    const deferralNote = reason ? ` (DEFERRED: ${reason})` : ' (DEFERRED)';
    lines[task.lineNumber - 1] = lines[task.lineNumber - 1].trimEnd() + deferralNote;
    try {
      fs.writeFileSync(fixPlanPath, lines.join('\n'), 'utf-8');
    } catch {
      // File write failed, keep cache valid and return false
      return false;
    }
  }

  return true;
}
