import type { PlanTask, ScheduledItem } from '../../shared/ralphTypes';
import { flattenTasks } from './planParser';

/**
 * Select the highest-priority incomplete task
 */
export function selectNextItem(workspacePath: string, parseFixPlan: () => { tasks: PlanTask[]; cachedTasks: PlanTask[] | null }): ScheduledItem | null {
  const { tasks } = parseFixPlan();
  const pendingTasks = flattenTasks(tasks).filter(t => t.status === 'pending');

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
export function getPendingItems(workspacePath: string, parseFixPlan: () => { tasks: PlanTask[]; cachedTasks: PlanTask[] | null }): ScheduledItem[] {
  const { tasks } = parseFixPlan();
  return flattenTasks(tasks)
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
