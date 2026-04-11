import { getDatabase } from '../database';
import { AcceptanceGate } from '../../shared/ralphTypes';

// ─────────────────────────────────────────────────────────────────────────────
// Artifact Types
// ─────────────────────────────────────────────────────────────────────────────

export type ArtifactType =
  | 'compiler_output'
  | 'test_log'
  | 'diff'
  | 'exit_metadata'
  | 'generated_file'
  | 'validation_result'
  | 'loop_summary';

export type ArtifactSeverity = 'error' | 'warning' | 'info';

export interface Artifact {
  id: string;
  projectId: string;
  runId: string;
  iteration: number;
  itemId: string | null; // Selected item that produced this artifact
  type: ArtifactType;
  content: string;
  exitCode: number | null;
  durationMs: number | null;
  severity: ArtifactSeverity;
  createdAt: number;
  metadata: Record<string, unknown>;
}

export interface ValidationResult {
  passed: boolean;
  gate: AcceptanceGate;
  output: string;
  exitCode: number | null;
  durationMs: number | null;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  code: string;
  message: string;
  line?: number;
  column?: number;
  file?: string;
}

export interface ValidationWarning {
  code: string;
  message: string;
  line?: number;
  column?: number;
  file?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Artifact Record Creation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create an artifact record for storage.
 */
export function createArtifact(params: {
  projectId: string;
  runId: string;
  iteration: number;
  itemId: string | null;
  type: ArtifactType;
  content: string;
  exitCode: number | null;
  durationMs: number | null;
  severity?: ArtifactSeverity;
  metadata?: Record<string, unknown>;
}): Artifact {
  const db = getDatabase();
  const artifact = db.createArtifact({
    projectId: params.projectId,
    runId: params.runId,
    iteration: params.iteration,
    itemId: params.itemId,
    type: params.type,
    content: params.content,
    exitCode: params.exitCode ?? null,
    durationMs: params.durationMs ?? null,
    severity: params.severity ?? 'info',
    metadata: params.metadata ?? {},
  });
  return artifact;
}

/**
 * Create a compiler output artifact.
 */
export function captureCompilerOutput(params: {
  projectId: string;
  runId: string;
  iteration: number;
  itemId: string | null;
  output: string;
  exitCode: number | null;
  durationMs: number | null;
  metadata?: Record<string, unknown>;
}): Artifact {
  const severity: ArtifactSeverity = params.exitCode === 0 ? 'info' : 'error';
  return createArtifact({
    projectId: params.projectId,
    runId: params.runId,
    iteration: params.iteration,
    itemId: params.itemId,
    type: 'compiler_output',
    content: params.output,
    exitCode: params.exitCode ?? null,
    durationMs: params.durationMs ?? null,
    severity,
    metadata: params.metadata ?? {},
  });
}

/**
 * Create a test log artifact.
 */
export function captureTestLog(params: {
  projectId: string;
  runId: string;
  iteration: number;
  itemId: string | null;
  output: string;
  exitCode: number | null;
  durationMs: number | null;
  testCount?: { passed: number; failed: number; skipped: number };
  metadata?: Record<string, unknown>;
}): Artifact {
  const passed = params.testCount?.passed ?? 0;
  const failed = params.testCount?.failed ?? 0;
  const severity: ArtifactSeverity = failed > 0 ? 'error' : (passed > 0 ? 'info' : 'warning');

  return createArtifact({
    projectId: params.projectId,
    runId: params.runId,
    iteration: params.iteration,
    itemId: params.itemId,
    type: 'test_log',
    content: params.output,
    exitCode: params.exitCode ?? null,
    durationMs: params.durationMs ?? null,
    severity,
    metadata: {
      testCount: params.testCount,
      ...(params.metadata ?? {}),
    },
  });
}

/**
 * Create a diff artifact.
 */
export function captureDiff(params: {
  projectId: string;
  runId: string;
  iteration: number;
  itemId: string | null;
  diff: string;
  metadata?: Record<string, unknown>;
}): Artifact {
  return createArtifact({
    projectId: params.projectId,
    runId: params.runId,
    iteration: params.iteration,
    itemId: params.itemId,
    type: 'diff',
    content: params.diff,
    exitCode: null,
    durationMs: null,
    severity: 'info',
    metadata: params.metadata ?? {},
  });
}

/**
 * Create an exit metadata artifact.
 */
export function captureExitMetadata(params: {
  projectId: string;
  runId: string;
  iteration: number;
  itemId: string | null;
  exitCode: number | null;
  signal?: number | null;
  durationMs: number | null;
  reason: string;
  metadata?: Record<string, unknown>;
}): Artifact {
  const severity: ArtifactSeverity = params.exitCode === 0 ? 'info' :
    (params.exitCode !== null ? 'error' : 'warning');

  return createArtifact({
    projectId: params.projectId,
    runId: params.runId,
    iteration: params.iteration,
    itemId: params.itemId,
    type: 'exit_metadata',
    content: JSON.stringify({ reason: params.reason, exitCode: params.exitCode, signal: params.signal }),
    exitCode: params.exitCode,
    durationMs: params.durationMs ?? null,
    severity,
    metadata: params.metadata ?? {},
  });
}

/**
 * Create a generated file artifact.
 */
export function captureGeneratedFile(params: {
  projectId: string;
  runId: string;
  iteration: number;
  itemId: string | null;
  filePath: string;
  content: string;
  metadata?: Record<string, unknown>;
}): Artifact {
  return createArtifact({
    projectId: params.projectId,
    runId: params.runId,
    iteration: params.iteration,
    itemId: params.itemId,
    type: 'generated_file',
    content: params.content.substring(0, 10000), // Limit content size
    exitCode: null,
    durationMs: null,
    severity: 'info',
    metadata: {
      filePath: params.filePath,
      size: params.content.length,
      ...(params.metadata ?? {}),
    },
  });
}

/**
 * Create a validation result artifact.
 */
export function captureValidationResult(params: {
  projectId: string;
  runId: string;
  iteration: number;
  itemId: string | null;
  result: ValidationResult;
  durationMs: number | null;
  metadata?: Record<string, unknown>;
}): Artifact {
  const severity: ArtifactSeverity = params.result.passed ? 'info' : 'error';

  return createArtifact({
    projectId: params.projectId,
    runId: params.runId,
    iteration: params.iteration,
    itemId: params.itemId,
    type: 'validation_result',
    content: JSON.stringify(params.result),
    exitCode: params.result.exitCode,
    durationMs: params.durationMs,
    severity,
    metadata: params.metadata,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Artifact Retrieval
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get all artifacts for a run.
 */
export function getArtifactsForRun(runId: string): Artifact[] {
  const db = getDatabase();
  return db.listArtifacts({ runId });
}

/**
 * Get artifacts for a specific iteration.
 */
export function getArtifactsForIteration(runId: string, iteration: number): Artifact[] {
  const db = getDatabase();
  return db.listArtifacts({ runId, iteration });
}

/**
 * Get artifacts for a specific item.
 */
export function getArtifactsForItem(runId: string, itemId: string): Artifact[] {
  const db = getDatabase();
  return db.listArtifacts({ runId, itemId });
}

/**
 * Get the latest artifact of a specific type for a run.
 */
export function getLatestArtifactOfType(runId: string, type: ArtifactType): Artifact | null {
  const db = getDatabase();
  const artifacts = db.listArtifacts({ runId, type });
  return artifacts.sort((a, b) => b.createdAt - a.createdAt)[0] ?? null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Artifact Retention and Rotation
// ─────────────────────────────────────────────────────────────────────────────

export interface RetentionPolicy {
  maxArtifactsPerRun: number;
  maxArtifactsPerType: number;
  maxAgeDays: number;
  retainErrors: boolean;
}

const DEFAULT_RETENTION_POLICY: RetentionPolicy = {
  maxArtifactsPerRun: 500,
  maxArtifactsPerType: 100,
  maxAgeDays: 30,
  retainErrors: true,
};

/**
 * Apply retention policy to clean up old artifacts.
 * Keeps errors regardless of age, but rotates other artifacts.
 */
export function applyRetentionPolicy(
  projectId: string,
  policy: Partial<RetentionPolicy> = {}
): { deleted: number; retained: number } {
  const db = getDatabase();
  const fullPolicy = { ...DEFAULT_RETENTION_POLICY, ...policy };
  const now = Date.now();
  const maxAgeMs = fullPolicy.maxAgeDays * 24 * 60 * 60 * 1000;

  let deleted = 0;

  // Get all artifacts sorted by creation time
  const artifacts = db.listArtifacts({ projectId });

  // Separate errors from other artifacts
  const errors: Artifact[] = [];
  const others: Artifact[] = [];

  for (const artifact of artifacts) {
    if (artifact.severity === 'error' && fullPolicy.retainErrors) {
      errors.push(artifact);
    } else {
      others.push(artifact);
    }
  }

  // Sort others by creation time descending (newest first)
  others.sort((a, b) => b.createdAt - a.createdAt);

  // Calculate how many we need to delete
  const totalToKeep = Math.min(fullPolicy.maxArtifactsPerRun, errors.length + others.length);
  const othersToKeepCount = Math.min(others.length, totalToKeep - errors.length);

  // Delete old artifacts beyond the keep count
  const toKeep = new Set([...errors.map(a => a.id), ...others.slice(0, othersToKeepCount).map(a => a.id)]);

  for (const artifact of artifacts) {
    if (!toKeep.has(artifact.id)) {
      // Check age - errors are retained regardless
      if (artifact.severity === 'error' && fullPolicy.retainErrors) {
        continue;
      }
      if (now - artifact.createdAt < maxAgeMs) {
        continue; // Within retention window
      }

      db.deleteArtifact(artifact.id);
      deleted++;
    }
  }

  return {
    deleted,
    retained: artifacts.length - deleted,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Database Artifact Operations (to be added to database.ts)
// ─────────────────────────────────────────────────────────────────────────────

// Note: These functions are implemented in database.ts as part of Phase 09
// The artifact table will be created in migration v4

declare module '../database' {
  interface SessionDatabase {
    createArtifact(params: {
      projectId: string;
      runId: string;
      iteration: number;
      itemId: string | null;
      type: ArtifactType;
      content: string;
      exitCode: number | null;
      durationMs: number | null;
      severity: ArtifactSeverity;
      metadata: Record<string, unknown>;
    }): Artifact;

    listArtifacts(params: {
      projectId?: string;
      runId?: string;
      iteration?: number;
      itemId?: string | null;
      type?: ArtifactType;
    }): Artifact[];

    getArtifact(id: string): Artifact | null;

    deleteArtifact(id: string): void;

    deleteArtifactsForRun(runId: string): void;
  }
}
