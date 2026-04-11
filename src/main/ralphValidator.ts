import * as fs from 'fs';
import * as path from 'path';
import { getDatabase } from './database';
import { getRalphBootstrap } from './ralphBootstrap';

// ─────────────────────────────────────────────────────────────────────────────
// Validation Types
// ─────────────────────────────────────────────────────────────────────────────

export type ValidationSeverity = 'error' | 'warning' | 'info';

export interface ValidationIssue {
  code: string;
  severity: ValidationSeverity;
  message: string;
  recovery: string;
  path?: string;
}

export interface ReadinessReport {
  ready: boolean;
  isFresh: boolean;
  isCorrupted: boolean;
  workspaceId: string;
  workspacePath: string;
  projectId: string | null;
  issues: ValidationIssue[];
  checkedAt: number;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Ralph Validator
// ─────────────────────────────────────────────────────────────────────────────

export class RalphValidator {
  private db = getDatabase();
  private bootstrap = getRalphBootstrap();

  // Required control files
  private readonly REQUIRED_FILES = ['PROMPT.md', 'AGENT.md', 'fix_plan.md'];
  private readonly REQUIRED_DIRS = ['specs'];
  private readonly METADATA_FILE = '.ralph';

  /**
   * Generate a full readiness report for a Ralph workspace
   */
  generateReadinessReport(workspaceId: string, workspacePath: string): ReadinessReport {
    const issues: ValidationIssue[] = [];
    const now = Date.now();

    // Check if workspace exists
    if (!fs.existsSync(workspacePath)) {
      return {
        ready: false,
        isFresh: false,
        isCorrupted: true,
        workspaceId,
        workspacePath,
        projectId: null,
        issues: [{
          code: 'WORKSPACE_NOT_FOUND',
          severity: 'error',
          message: `Workspace path does not exist: ${workspacePath}`,
          recovery: 'Please verify the workspace path is correct.',
          path: workspacePath,
        }],
        checkedAt: now,
      };
    }

    // Check for Ralph project in database
    const project = this.db.getRalphProjectByWorkspaceId(workspaceId);

    // Check for Ralph metadata file
    const metadataPath = path.join(workspacePath, this.METADATA_FILE);
    const hasMetadataFile = fs.existsSync(metadataPath);

    // Check required control files
    const missingFiles = this.checkRequiredFiles(workspacePath);
    issues.push(...missingFiles);

    // Check required directories
    const missingDirs = this.checkRequiredDirs(workspacePath);
    issues.push(...missingDirs);

    // Check for malformed metadata
    if (hasMetadataFile) {
      const malformedIssue = this.validateMetadata(workspacePath);
      if (malformedIssue) {
        issues.push(malformedIssue);
      }
    }

    // Check for stale session state
    const staleStateIssues = this.checkStaleState(workspaceId, project?.id ?? null);
    issues.push(...staleStateIssues);

    // Determine workspace state
    const isFresh = !project && missingFiles.length === this.REQUIRED_FILES.length && missingDirs.length === this.REQUIRED_DIRS.length;
    const isCorrupted = !isFresh && (issues.some(i => i.severity === 'error'));

    return {
      ready: issues.filter(i => i.severity === 'error').length === 0,
      isFresh,
      isCorrupted,
      workspaceId,
      workspacePath,
      projectId: project?.id ?? null,
      issues,
      checkedAt: now,
    };
  }

  /**
   * Check if required files exist
   */
  private checkRequiredFiles(workspacePath: string): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    for (const file of this.REQUIRED_FILES) {
      const filePath = path.join(workspacePath, file);
      if (!fs.existsSync(filePath)) {
        issues.push({
          code: 'MISSING_REQUIRED_FILE',
          severity: 'error',
          message: `Required Ralph control file is missing: ${file}`,
          recovery: `Bootstrap the workspace to create ${file} with default content.`,
          path: filePath,
        });
      } else if (!fs.statSync(filePath).isFile()) {
        issues.push({
          code: 'INVALID_REQUIRED_FILE',
          severity: 'error',
          message: `Required Ralph control file is not a file: ${file}`,
          recovery: `Remove the conflicting path and bootstrap to create ${file}.`,
          path: filePath,
        });
      }
    }

    return issues;
  }

  /**
   * Check if required directories exist
   */
  private checkRequiredDirs(workspacePath: string): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    for (const dir of this.REQUIRED_DIRS) {
      const dirPath = path.join(workspacePath, dir);
      if (!fs.existsSync(dirPath)) {
        issues.push({
          code: 'MISSING_REQUIRED_DIR',
          severity: 'error',
          message: `Required Ralph directory is missing: ${dir}/`,
          recovery: `Bootstrap the workspace to create the ${dir}/ directory.`,
          path: dirPath,
        });
      } else if (!fs.statSync(dirPath).isDirectory()) {
        issues.push({
          code: 'INVALID_REQUIRED_DIR',
          severity: 'error',
          message: `Required Ralph path is not a directory: ${dir}/`,
          recovery: `Remove the conflicting path and bootstrap to create the ${dir}/ directory.`,
          path: dirPath,
        });
      }
    }

    return issues;
  }

  /**
   * Validate Ralph metadata file
   */
  private validateMetadata(workspacePath: string): ValidationIssue | null {
    const metadataPath = path.join(workspacePath, this.METADATA_FILE);

    try {
      const content = fs.readFileSync(metadataPath, 'utf-8');
      const metadata = JSON.parse(content);

      if (!metadata.version || typeof metadata.version !== 'number') {
        return {
          code: 'MALFORMED_METADATA',
          severity: 'warning',
          message: 'Ralph metadata file has invalid version field',
          recovery: 'Bootstrap with --force to repair the metadata file.',
          path: metadataPath,
        };
      }

      if (!metadata.bootstrappedAt || typeof metadata.bootstrappedAt !== 'number') {
        return {
          code: 'MALFORMED_METADATA',
          severity: 'warning',
          message: 'Ralph metadata file has invalid bootstrappedAt field',
          recovery: 'Bootstrap with --force to repair the metadata file.',
          path: metadataPath,
        };
      }
    } catch {
      return {
        code: 'MALFORMED_METADATA',
        severity: 'error',
        message: 'Ralph metadata file is malformed or not valid JSON',
        recovery: 'Bootstrap with --force to repair the metadata file, or delete it manually.',
        path: metadataPath,
      };
    }

    return null;
  }

  /**
   * Check for stale session state
   */
  private checkStaleState(workspaceId: string, projectId: string | null): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    if (!projectId) {
      return issues;
    }

    // Check for active loop runs that might be stale
    const activeRuns = this.db.listActiveLoopRuns(projectId);
    for (const run of activeRuns) {
      if (run.startTime) {
        const staleThreshold = 30 * 60 * 1000; // 30 minutes
        const timeSinceStart = Date.now() - run.startTime;

        if (timeSinceStart > staleThreshold) {
          issues.push({
            code: 'STALE_ACTIVE_RUN',
            severity: 'warning',
            message: `Loop run "${run.name}" appears to be stale (running for ${Math.floor(timeSinceStart / 60000)} minutes)`,
            recovery: `Mark the run as completed/failed or restart it.`,
          });
        }
      }
    }

    return issues;
  }

  /**
   * Validate workspace before start
   */
  validateBeforeStart(workspaceId: string, workspacePath: string): ValidationResult {
    const report = this.generateReadinessReport(workspaceId, workspacePath);
    return {
      valid: report.ready,
      issues: report.issues,
    };
  }

  /**
   * Validate workspace before resume
   */
  validateBeforeResume(workspaceId: string, workspacePath: string): ValidationResult {
    const report = this.generateReadinessReport(workspaceId, workspacePath);

    // Resume has stricter requirements - we need an existing project
    if (!report.projectId) {
      return {
        valid: false,
        issues: [{
          code: 'NO_PROJECT_TO_RESUME',
          severity: 'error',
          message: 'No Ralph project exists in this workspace',
          recovery: 'Bootstrap the workspace first before attempting to resume.',
        }],
      };
    }

    // Check for active runs
    const project = this.db.getRalphProject(report.projectId);
    if (project) {
      const activeRuns = this.db.listActiveLoopRuns(project.id);
      if (activeRuns.length > 0) {
        return {
          valid: false,
          issues: [{
            code: 'ACTIVE_RUN_EXISTS',
            severity: 'error',
            message: `A loop run is already in progress: ${activeRuns[0].name}`,
            recovery: 'Complete or cancel the existing run before starting a new one.',
          }],
        };
      }
    }

    return {
      valid: report.ready,
      issues: report.issues,
    };
  }

  /**
   * Validate workspace before bootstrap repair
   */
  validateBeforeRepair(workspacePath: string): ValidationResult {
    const issues: ValidationIssue[] = [];

    // For repair, we just check if the path is valid
    if (!fs.existsSync(workspacePath)) {
      issues.push({
        code: 'WORKSPACE_NOT_FOUND',
        severity: 'error',
        message: `Workspace path does not exist: ${workspacePath}`,
        recovery: 'Please verify the workspace path is correct.',
      });
    } else if (!fs.statSync(workspacePath).isDirectory()) {
      issues.push({
        code: 'NOT_A_DIRECTORY',
        severity: 'error',
        message: `Workspace path is not a directory: ${workspacePath}`,
        recovery: 'Please provide a valid directory path.',
      });
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }

  /**
   * Check if a workspace is a fresh (never bootstrapped) Ralph workspace
   */
  isFreshWorkspace(workspaceId: string, workspacePath: string): boolean {
    const report = this.generateReadinessReport(workspaceId, workspacePath);
    return report.isFresh;
  }

  /**
   * Check if a workspace is corrupted
   */
  isCorrupted(workspaceId: string, workspacePath: string): boolean {
    const report = this.generateReadinessReport(workspaceId, workspacePath);
    return report.isCorrupted;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Singleton instance
// ─────────────────────────────────────────────────────────────────────────────

let ralphValidatorInstance: RalphValidator | null = null;

export function getRalphValidator(): RalphValidator {
  if (!ralphValidatorInstance) {
    ralphValidatorInstance = new RalphValidator();
  }
  return ralphValidatorInstance;
}

export function resetRalphValidator(): void {
  ralphValidatorInstance = null;
}
