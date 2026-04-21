import * as fs from 'fs';
import * as path from 'path';
import type { PlanTask } from '../../shared/ralphTypes';

/**
 * Parse fix_plan.md and extract tasks
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function parseFixPlan(workspacePath: string, _cachedTasks: PlanTask[] | null): { tasks: PlanTask[]; cachedTasks: PlanTask[] | null } {
  const fixPlanPath = path.join(workspacePath, 'fix_plan.md');

  // Validate the resolved path is still within workspace
  if (!fixPlanPath.startsWith(workspacePath)) {
    return { tasks: [], cachedTasks: null };
  }

  if (!fs.existsSync(fixPlanPath)) {
    return { tasks: [], cachedTasks: null };
  }

  const content = fs.readFileSync(fixPlanPath, 'utf-8');
  const tasks = parsePlanContent(content);
  return { tasks, cachedTasks: tasks };
}

/**
 * Parse plan markdown content into tasks
 */
export function parsePlanContent(content: string): PlanTask[] {
  const lines = content.split('\n');
  const tasks: PlanTask[] = [];
  const stack: PlanTask[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const task = parseTaskLine(line, i + 1);

    if (task) {
      // Determine parent based on indentation
      while (stack.length > 0 && getIndentFromTask(stack[stack.length - 1]) <= getIndentFromTask(task)) {
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

  return tasks;
}

/**
 * Parse a single task line
 */
export function parseTaskLine(line: string, lineNumber: number): PlanTask | null {
  // Match checkbox patterns: "- [ ]", "- [x]", "- [X]", "* [ ]", "* [x]"
  const checkboxMatch = line.match(/^(\s*)-\s*\[([ xX])\]\s*(.+)$/);

  if (!checkboxMatch) {
    return null;
  }

  const [, indent, checkbox, title] = checkboxMatch;
  const status = checkboxToStatus(checkbox);

  // Parse priority from title (e.g., "HIGH: Fix bug" or "[P1] Task")
  const priority = extractPriority(title);

  return {
    id: generateTaskId(title, lineNumber),
    title: title.trim(),
    description: '', // Description would come from following lines
    status,
    checkbox: checkboxMatch[0],
    lineNumber,
    indentLevel: indent.length,
    priority,
    children: [],
    parentId: null,
  };
}

/**
 * Get indentation level from a task
 */
function getIndentFromTask(task: PlanTask): number {
  return task.indentLevel;
}

/**
 * Get indentation level of a task line
 */
export function getIndent(lineNumber: number, tasks: PlanTask[]): number {
  const task = tasks.find(t => t.lineNumber === lineNumber);
  return task?.indentLevel ?? 0;
}

/**
 * Convert checkbox character to status
 */
export function checkboxToStatus(checkbox: string): 'pending' | 'completed' {
  return checkbox.toLowerCase() === 'x' ? 'completed' : 'pending';
}

/**
 * Extract priority from task title
 */
export function extractPriority(title: string): number {
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
 * Generate a unique task ID using crypto
 */
export function generateTaskId(title: string, lineNumber: number): string {
  const randomPart = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  return `task-${lineNumber}-${randomPart}`;
}

/**
 * Flatten nested tasks into a single array
 */
export function flattenTasks(tasks: PlanTask[]): PlanTask[] {
  const result: PlanTask[] = [];
  for (const task of tasks) {
    result.push(task);
    if (task.children.length > 0) {
      result.push(...flattenTasks(task.children));
    }
  }
  return result;
}

/**
 * Update task status in fix_plan.md content
 * Returns new content with updated checkbox
 */
export function updateTaskStatus(content: string, taskTitle: string, newStatus: 'pending' | 'completed'): string {
  const lines = content.split('\n');
  const result: string[] = [];

  for (const line of lines) {
    // Match checkbox patterns for this task
    const checkboxMatch = line.match(/^(\s*)-\s*\[([ xX])\]\s*(.+)$/);
    if (checkboxMatch) {
      const [, indent, checkbox, title] = checkboxMatch;
      if (title.trim() === taskTitle) {
        const newCheckbox = newStatus === 'completed' ? 'x' : ' ';
        result.push(`${indent}- [${newCheckbox}] ${title}`);
        continue;
      }
    }
    result.push(line);
  }

  return result.join('\n');
}

/**
 * Write updated plan content to fix_plan.md
 */
export function writeUpdatedPlan(workspacePath: string, newContent: string): void {
  const fixPlanPath = path.join(workspacePath, 'fix_plan.md');
  // Validate path is within workspace
  if (!fixPlanPath.startsWith(workspacePath)) {
    throw new Error('Invalid workspace path for fix_plan.md');
  }
  fs.writeFileSync(fixPlanPath, newContent, 'utf-8');
}

/**
 * Mark a task as completed in fix_plan.md
 */
export function markTaskCompleted(workspacePath: string, taskTitle: string): boolean {
  const fixPlanPath = path.join(workspacePath, 'fix_plan.md');
  if (!fs.existsSync(fixPlanPath)) {
    return false;
  }

  const content = fs.readFileSync(fixPlanPath, 'utf-8');
  const newContent = updateTaskStatus(content, taskTitle, 'completed');
  writeUpdatedPlan(workspacePath, newContent);
  return true;
}

/**
 * Mark a task as pending in fix_plan.md
 */
export function markTaskPending(workspacePath: string, taskTitle: string): boolean {
  const fixPlanPath = path.join(workspacePath, 'fix_plan.md');
  if (!fs.existsSync(fixPlanPath)) {
    return false;
  }

  const content = fs.readFileSync(fixPlanPath, 'utf-8');
  const newContent = updateTaskStatus(content, taskTitle, 'pending');
  writeUpdatedPlan(workspacePath, newContent);
  return true;
}
