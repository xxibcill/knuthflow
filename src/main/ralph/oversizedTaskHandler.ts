import type { ScheduledItem, PlanTask } from '../../shared/ralphTypes';
import { findTaskById } from './taskFinder';

/**
 * Check if a task should be split into smaller increments
 */
export function shouldSplitTask(item: ScheduledItem, parseFixPlan: () => { tasks: PlanTask[]; cachedTasks: PlanTask[] | null }): boolean {
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
  const { tasks } = parseFixPlan();
  const task = findTaskById(tasks, item.id);
  if (task && task.children.length > 3) {
    return true;
  }

  return false;
}

/**
 * Create an incremental sub-task for oversized tasks
 */
export function createIncrementalSubTask(item: ScheduledItem, incrementNumber: number, totalIncrements: number): ScheduledItem {
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
