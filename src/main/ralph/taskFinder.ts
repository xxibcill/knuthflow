import type { PlanTask } from '../../shared/ralphTypes';

/**
 * Find a task by ID in the task tree
 */
export function findTaskById(tasks: PlanTask[], id: string): PlanTask | null {
  for (const task of tasks) {
    if (task.id === id) {
      return task;
    }
    if (task.children.length > 0) {
      const found = findTaskById(task.children, id);
      if (found) return found;
    }
  }
  return null;
}
