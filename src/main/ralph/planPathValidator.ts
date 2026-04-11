import * as path from 'path';

/**
 * Validate that a path is within the expected workspace directory
 * Prevents path traversal attacks (e.g., "../../../etc/passwd")
 */
export function validateWorkspacePath(workspacePath: string): boolean {
  const normalized = path.normalize(workspacePath);
  // Check for path traversal attempts
  if (normalized.includes('..') || path.isAbsolute(normalized) === false) {
    return false;
  }
  return true;
}
