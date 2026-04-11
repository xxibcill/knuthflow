import * as fs from 'fs';
import * as path from 'path';
import type { ScheduledItem, AcceptanceGate, PlanTask } from '../../shared/ralphTypes';
import { findTaskById } from './taskFinder';

/**
 * Determine acceptance gate for a selected item
 * Uses word boundary matching for more accurate detection
 */
export function determineAcceptanceGate(item: ScheduledItem): AcceptanceGate | null {
  const titleLower = item.title.toLowerCase();

  // Test-related tasks - match "test", "tests", "testing", "spec", "specs"
  if (/\b(test(?:s|ing)?|specs?)\b/.test(titleLower)) {
    return {
      type: 'test',
      description: `Run tests for: ${item.title}`,
      command: 'npm test',
      expectedExitCode: 0,
      timeoutMs: 120000,
    };
  }

  // Build-related tasks - match "build", "building", "compile", "compiling", "compilation"
  if (/\b(build(?:ing)?|compile[ds]?|compilation)\b/.test(titleLower)) {
    return {
      type: 'build',
      description: `Build project: ${item.title}`,
      command: 'npm run build',
      expectedExitCode: 0,
      timeoutMs: 180000,
    };
  }

  // Lint-related tasks - match "lint", "linting", "format", "formatting", "formatting"
  if (/\b(lint(?:ing)?|format(?:ting)?)\b/.test(titleLower)) {
    return {
      type: 'lint',
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
export function updateAcceptanceGate(workspacePath: string, itemId: string, gate: AcceptanceGate, findTaskByIdFn: (tasks: PlanTask[], id: string) => PlanTask | null, parseFixPlan: () => { tasks: PlanTask[]; cachedTasks: PlanTask[] | null }): boolean {
  // Validate itemId format to prevent injection
  if (!itemId || typeof itemId !== 'string' || itemId.length > 200) {
    return false;
  }

  const { tasks } = parseFixPlan();
  const task = findTaskByIdFn(tasks, itemId);

  if (!task) {
    return false;
  }

  // Append gate info as a comment in the task
  const fixPlanPath = path.join(workspacePath, 'fix_plan.md');
  const content = fs.readFileSync(fixPlanPath, 'utf-8');
  const lines = content.split('\n');

  if (task.lineNumber > 0 && task.lineNumber <= lines.length) {
    const gateInfo = `\n  <!-- Acceptance: ${gate.type} - ${gate.description}${gate.command ? ` (${gate.command})` : ''} -->`;
    lines[task.lineNumber - 1] = lines[task.lineNumber - 1].trimEnd() + gateInfo;
    try {
      fs.writeFileSync(fixPlanPath, lines.join('\n'), 'utf-8');
    } catch {
      return false;
    }
  }

  return true;
}
