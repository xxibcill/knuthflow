import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { getDatabase } from '../database';

// ─────────────────────────────────────────────────────────────────────────────
// Checkpoint Result Types
// ─────────────────────────────────────────────────────────────────────────────

export interface CheckpointResult {
  success: boolean;
  commitSha?: string;
  message?: string;
  error?: string;
  code?: string;
  /** Files that were staged and committed */
  stagedFiles?: string[];
  /** Whether unrelated changes were detected and excluded */
  unrelatedChangesExcluded?: boolean;
  /** Indicates this was a dry-run - no actual commit was created */
  isDryRun?: boolean;
}

export interface PreflightCheckResult {
  clean: boolean;
  dirtyFiles: string[];
  unrelatedChanges: string[];
  message: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Whitelisted Git Actions
// ─────────────────────────────────────────────────────────────────────────────

type GitAction = 'status' | 'diff' | 'stage' | 'commit' | 'tag' | 'log';

/**
 * Check if a git command is whitelisted for Ralph checkpoint operations.
 * Only safe, read-only or explicitly allowed operations are permitted.
 */
export function isGitActionAllowed(action: GitAction): boolean {
  const allowedActions: GitAction[] = ['status', 'diff', 'stage', 'commit', 'tag', 'log'];
  return allowedActions.includes(action);
}

/**
 * Validate that a git command doesn't contain dangerous patterns.
 * This is a defense-in-depth measure - actual command construction is limited
 * to whitelisted operations only.
 */
export function validateGitCommand(command: string): { valid: boolean; reason?: string } {
  const dangerousPatterns = [
    /--force/i,
    /-f\s/i,
    /--delete/i,
    /rm\s+-rf/i,
    /git\s+push/i,
    /git\s+rebase/i,
    /git\s+reset\s+--hard/i,
    /git\s+checkout\s+--force/i,
    /git\s+clean\s+-fd/i,
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(command)) {
      return { valid: false, reason: `Command contains disallowed pattern: ${pattern}` };
    }
  }

  return { valid: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// Workspace Path Validation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validate that a workspace path exists and is a directory.
 * Prevents cryptic errors from git commands when given invalid paths.
 */
function isValidWorkspacePath(workspacePath: string): boolean {
  try {
    const stats = fs.statSync(workspacePath);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Preflight Checks
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Check if the workspace has unrelated dirty changes that should not be
 * swept into a Ralph checkpoint.
 *
 * Returns a preflight check result with details about any dirty state.
 */
export function checkWorkspaceCleanState(
  workspacePath: string,
  ralphFiles: string[] = ['PROMPT.md', 'AGENT.md', 'fix_plan.md', 'specs/']
): PreflightCheckResult {
  const result: PreflightCheckResult = {
    clean: true,
    dirtyFiles: [],
    unrelatedChanges: [],
    message: 'Workspace is clean',
  };

  // Validate workspace path
  if (!isValidWorkspacePath(workspacePath)) {
    result.clean = false;
    result.message = 'Invalid workspace path';
    return result;
  }

  // Get all modified files
  const statusResult = runGitCommand(workspacePath, ['status', '--porcelain']);
  if (!statusResult.success || !statusResult.output) {
    result.clean = false;
    result.message = 'Unable to read git status';
    return result;
  }

  const lines = statusResult.output.trim().split('\n').filter(line => line.length > 0);
  if (lines.length === 0) {
    // No changes at all - clean
    return result;
  }

  // Parse modified files (format: XY filename, where X=staged, Y=unstaged)
  const modifiedFiles: string[] = [];
  for (const line of lines) {
    // Status format: XY filename
    // X = staged status, Y = unstaged status
    // Common values: M=modified, A=added, D=deleted, ??=untracked
    const match = line.match(/^[MADRXC??]\s+(.+)$/);
    if (match) {
      modifiedFiles.push(match[1]);
    }
  }

  // Separate Ralph-related files from unrelated files
  const ralphFileSet = new Set(ralphFiles.map(f => f.toLowerCase()));

  for (const file of modifiedFiles) {
    const fileLower = file.toLowerCase();

    // Check if it's a Ralph control file
    let isRalphFile = false;
    for (const ralphFile of ralphFileSet) {
      if (fileLower === ralphFile || fileLower.startsWith(ralphFile.toLowerCase())) {
        isRalphFile = true;
        break;
      }
    }

    if (isRalphFile) {
      // Ralph-related changes are okay to include in checkpoint
      continue;
    } else {
      // Unrelated change
      result.dirtyFiles.push(file);
      result.unrelatedChanges.push(file);
    }
  }

  if (result.dirtyFiles.length > 0) {
    result.clean = false;
    result.message = `Found ${result.dirtyFiles.length} unrelated changes that will not be included in checkpoint`;
  }

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// Checkpoint Operations
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Stage Ralph-related files for commit.
 * Only stages specific files that are part of Ralph's control stack.
 */
export function stageRalphFiles(
  workspacePath: string,
  files: string[] = ['PROMPT.md', 'AGENT.md', 'fix_plan.md', 'specs/']
): { success: boolean; stagedFiles: string[]; error?: string } {
  // Validate workspace path
  if (!isValidWorkspacePath(workspacePath)) {
    return { success: false, stagedFiles: [], error: 'Invalid workspace path' };
  }

  // First check which files actually exist and are modified
  const statusResult = runGitCommand(workspacePath, ['status', '--porcelain']);
  if (!statusResult.success) {
    return { success: false, stagedFiles: [], error: 'Unable to get git status' };
  }

  const lines = (statusResult.output || '').trim().split('\n').filter(line => line.length > 0);
  const modifiedSet = new Set<string>();

  for (const line of lines) {
    const match = line.match(/^[MADRXC??]\s+(.+)$/);
    if (match) {
      modifiedSet.add(match[1]);
    }
  }

  // Stage only files that exist and are modified
  const filesToStage = files.filter(f => modifiedSet.has(f));

  if (filesToStage.length === 0) {
    return { success: true, stagedFiles: [] };
  }

  // Stage the files
  const stageResult = runGitCommand(workspacePath, ['add', ...filesToStage]);
  if (!stageResult.success) {
    return { success: false, stagedFiles: [], error: `Failed to stage files: ${stageResult.error}` };
  }

  return { success: true, stagedFiles: filesToStage };
}

/**
 * Create a checkpoint commit for a validated Ralph iteration.
 * The commit message ties the checkpoint to the loop iteration and selected item.
 */
export function createCheckpoint(
  workspacePath: string,
  runId: string,
  iteration: number,
  itemTitle: string,
  options: {
    includePlanSnapshot?: boolean;
    tagPattern?: string;
    dryRun?: boolean;
  } = {}
): CheckpointResult {
  const { tagPattern, dryRun = false } = options;

  // Validate workspace path
  if (!isValidWorkspacePath(workspacePath)) {
    return {
      success: false,
      error: 'Invalid workspace path',
      code: 'INVALID_WORKSPACE_PATH',
    };
  }

  // Stage Ralph control files
  const stageResult = stageRalphFiles(workspacePath);
  if (!stageResult.success) {
    return {
      success: false,
      error: `Failed to stage files: ${stageResult.error}`,
      code: 'STAGE_FAILED',
    };
  }

  // If nothing to commit, return early
  if (stageResult.stagedFiles.length === 0) {
    return {
      success: false,
      error: 'No Ralph files to commit',
      code: 'NOTHING_TO_COMMIT',
    };
  }

  // Build commit message
  const timestamp = new Date().toISOString();
  const shortRunId = runId.substring(0, 8);
  const commitMessage = [
    `Ralph checkpoint: ${itemTitle}`,
    '',
    `Iteration: ${iteration}`,
    `Run: ${shortRunId}`,
    `Timestamp: ${timestamp}`,
    '',
    '[skip ci] - Ralph autonomous checkpoint',
  ].join('\n');

  if (dryRun) {
    // Dry-run mode: simulate success without creating actual commit
    // Callers should check isDryRun flag to distinguish from real commits
    return {
      success: true,
      isDryRun: true,
      message: `Dry-run: would create commit with message: ${commitMessage}`,
      stagedFiles: stageResult.stagedFiles,
      unrelatedChangesExcluded: false,
    };
  }

  // Create the commit
  const commitResult = runGitCommand(workspacePath, ['commit', '-m', commitMessage]);
  if (!commitResult.success) {
    return {
      success: false,
      error: `Failed to create commit: ${commitResult.error}`,
      code: 'COMMIT_FAILED',
      stagedFiles: stageResult.stagedFiles,
    };
  }

  // Get the commit SHA using git rev-parse
  const shaResult = runGitCommand(workspacePath, ['rev-parse', 'HEAD']);
  const commitSha = shaResult.success ? shaResult.output?.trim() : undefined;

  // Optionally create a tag
  if (tagPattern) {
    const tagName = tagPattern
      .replace('{runId}', shortRunId)
      .replace('{iteration}', String(iteration))
      .replace('{timestamp}', timestamp.replace(/[:.]/g, '-'));

    const tagResult = runGitCommand(workspacePath, ['tag', '-a', tagName, '-m', `Ralph checkpoint for ${itemTitle}`]);
    if (!tagResult.success) {
      console.warn(`[RalphCheckpoint] Failed to create tag ${tagName}: ${tagResult.error}`);
      // Don't fail the checkpoint if tag creation fails
    }
  }

  // Store checkpoint metadata in database
  if (commitSha) {
    storeCheckpointMetadata(runId, iteration, commitSha, stageResult.stagedFiles);
  }

  return {
    success: true,
    commitSha,
    message: `Checkpoint created: ${commitSha?.substring(0, 8)}`,
    stagedFiles: stageResult.stagedFiles,
    unrelatedChangesExcluded: true,
  };
}

/**
 * Get checkpoint metadata for a run.
 */
export function getCheckpointHistory(runId: string): Array<{
  commitSha: string;
  iteration: number;
  stagedFiles: string[];
  createdAt: number;
}> {
  const db = getDatabase();
  const checkpoints = db.listCheckpoints(runId);
  return checkpoints;
}

// ─────────────────────────────────────────────────────────────────────────────
// Database Operations
// ─────────────────────────────────────────────────────────────────────────────

function storeCheckpointMetadata(
  runId: string,
  iteration: number,
  commitSha: string,
  stagedFiles: string[]
): void {
  const db = getDatabase();
  const now = Date.now();

  // Store in checkpoint metadata table
  try {
    db.createCheckpoint({
      runId,
      iteration,
      commitSha,
      stagedFiles: JSON.stringify(stagedFiles),
      createdAt: now,
    });
  } catch (err) {
    console.error('[RalphCheckpoint] Failed to store checkpoint metadata:', err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Git Command Runner
// ─────────────────────────────────────────────────────────────────────────────

interface GitCommandResult {
  success: boolean;
  output?: string;
  error?: string;
  exitCode: number;
}

function runGitCommand(
  cwd: string,
  args: string[]
): GitCommandResult {
  const timeoutMs = 30000;

  const result = spawnSync('git', args, {
    cwd,
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
    timeout: timeoutMs,
    encoding: 'utf-8',
  });

  const exitCode = result.status ?? 1;
  const stdout = result.stdout ?? '';
  const stderr = result.stderr ?? '';

  if (exitCode === 0) {
    return {
      success: true,
      output: stdout,
      exitCode: 0,
    };
  }

  return {
    success: false,
    output: stdout,
    error: stderr || `Git command exited with code ${exitCode}`,
    exitCode,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Singleton
// ─────────────────────────────────────────────────────────────────────────────

export class RalphCheckpointManager {
  private workspacePath: string;

  constructor(workspacePath: string) {
    this.workspacePath = workspacePath;
  }

  /**
   * Run preflight check to ensure workspace is in a good state for checkpointing
   */
  checkCleanState(ralphFiles?: string[]): PreflightCheckResult {
    return checkWorkspaceCleanState(this.workspacePath, ralphFiles);
  }

  /**
   * Create a checkpoint for a validated iteration
   */
  checkpoint(
    runId: string,
    iteration: number,
    itemTitle: string,
    options?: { includePlanSnapshot?: boolean; tagPattern?: string; dryRun?: boolean }
  ): CheckpointResult {
    return createCheckpoint(this.workspacePath, runId, iteration, itemTitle, options);
  }

  /**
   * Get checkpoint history for a run
   */
  getHistory(runId: string) {
    return getCheckpointHistory(runId);
  }

  /**
   * Check if git is available in this workspace
   */
  isGitAvailable(): boolean {
    const result = runGitCommand(this.workspacePath, ['--version']);
    return result.success;
  }
}

export function getRalphCheckpoint(workspacePath: string): RalphCheckpointManager {
  return new RalphCheckpointManager(workspacePath);
}
