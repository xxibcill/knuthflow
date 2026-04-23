import { getDatabase, RalphArtifact, ArtifactType, ArtifactSeverity } from '../database';
import { AcceptanceGate } from '../../shared/ralphTypes';

// Re-export types from database for convenience
export { RalphArtifact, ArtifactType, ArtifactSeverity };

// Maximum bytes to store for generated file artifacts
const MAX_GENERATED_FILE_CONTENT_BYTES = 10000;

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
}): RalphArtifact {
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
}): RalphArtifact {
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
}): RalphArtifact {
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
}): RalphArtifact {
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
}): RalphArtifact {
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
}): RalphArtifact {
  const isTruncated = params.content.length > MAX_GENERATED_FILE_CONTENT_BYTES;

  return createArtifact({
    projectId: params.projectId,
    runId: params.runId,
    iteration: params.iteration,
    itemId: params.itemId,
    type: 'generated_file',
    content: isTruncated ? params.content.substring(0, MAX_GENERATED_FILE_CONTENT_BYTES) : params.content,
    exitCode: null,
    durationMs: null,
    severity: 'info',
    metadata: {
      filePath: params.filePath,
      size: params.content.length,
      truncated: isTruncated,
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
}): RalphArtifact {
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
// Connector Artifact Creation (Phase 30)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Redact sensitive fields from connector data before storing as artifact.
 */
function redactConnectorData(data: Record<string, unknown>): Record<string, unknown> {
  const redacted = { ...data };
  const sensitiveKeys = ['secret', 'token', 'password', 'key', 'auth', 'credential', 'api_key', 'apikey'];
  for (const key of Object.keys(redacted)) {
    const lowerKey = key.toLowerCase();
    if (sensitiveKeys.some(sk => lowerKey.includes(sk))) {
      redacted[key] = '[REDACTED]';
    }
  }
  return redacted;
}

/**
 * Create a connector input artifact.
 */
export function captureConnectorInput(params: {
  projectId: string;
  runId: string;
  iteration: number;
  itemId: string | null;
  connectorId: string;
  capability: string;
  operation: string;
  targetScope?: string;
  resourceId?: string;
  inputParams: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}): RalphArtifact {
  return createArtifact({
    projectId: params.projectId,
    runId: params.runId,
    iteration: params.iteration,
    itemId: params.itemId,
    type: 'connector_input',
    content: JSON.stringify({
      connectorId: params.connectorId,
      capability: params.capability,
      operation: params.operation,
      targetScope: params.targetScope,
      resourceId: params.resourceId,
      inputParams: redactConnectorData(params.inputParams),
    }),
    exitCode: null,
    durationMs: null,
    severity: 'info',
    metadata: {
      connectorId: params.connectorId,
      capability: params.capability,
      operation: params.operation,
      ...(params.metadata ?? {}),
    },
  });
}

/**
 * Create a connector output artifact.
 */
export function captureConnectorOutput(params: {
  projectId: string;
  runId: string;
  iteration: number;
  itemId: string | null;
  connectorId: string;
  capability: string;
  operation: string;
  success: boolean;
  outputData?: unknown;
  metadata?: Record<string, unknown>;
}): RalphArtifact {
  const severity: ArtifactSeverity = params.success ? 'info' : 'error';

  return createArtifact({
    projectId: params.projectId,
    runId: params.runId,
    iteration: params.iteration,
    itemId: params.itemId,
    type: 'connector_output',
    content: JSON.stringify({
      connectorId: params.connectorId,
      capability: params.capability,
      operation: params.operation,
      success: params.success,
      outputData: params.outputData ? redactConnectorData(params.outputData as Record<string, unknown>) : undefined,
    }),
    exitCode: params.success ? 0 : 1,
    durationMs: null,
    severity,
    metadata: {
      connectorId: params.connectorId,
      capability: params.capability,
      operation: params.operation,
      success: params.success,
      ...(params.metadata ?? {}),
    },
  });
}

/**
 * Create a connector failure artifact.
 */
export function captureConnectorFailure(params: {
  projectId: string;
  runId: string;
  iteration: number;
  itemId: string | null;
  connectorId: string;
  capability: string;
  operation: string;
  errorCode: string;
  errorMessage: string;
  retryable: boolean;
  metadata?: Record<string, unknown>;
}): RalphArtifact {
  return createArtifact({
    projectId: params.projectId,
    runId: params.runId,
    iteration: params.iteration,
    itemId: params.itemId,
    type: 'connector_failure',
    content: JSON.stringify({
      connectorId: params.connectorId,
      capability: params.capability,
      operation: params.operation,
      errorCode: params.errorCode,
      errorMessage: params.errorMessage,
      retryable: params.retryable,
      recoveryHint: getConnectorErrorRecovery(params.errorCode),
    }),
    exitCode: 1,
    durationMs: null,
    severity: 'error',
    metadata: {
      connectorId: params.connectorId,
      capability: params.capability,
      operation: params.operation,
      errorCode: params.errorCode,
      retryable: params.retryable,
      ...(params.metadata ?? {}),
    },
  });
}

/**
 * Create a connector health artifact.
 */
export function captureConnectorHealth(params: {
  projectId: string;
  runId: string;
  iteration: number;
  itemId: string | null;
  connectorId: string;
  configId: string;
  status: string;
  message: string;
  latencyMs?: number;
  metadata?: Record<string, unknown>;
}): RalphArtifact {
  const severity: ArtifactSeverity = params.status === 'healthy' ? 'info' :
    (params.status === 'degraded' ? 'warning' : 'error');

  return createArtifact({
    projectId: params.projectId,
    runId: params.runId,
    iteration: params.iteration,
    itemId: params.itemId,
    type: 'connector_health',
    content: JSON.stringify({
      connectorId: params.connectorId,
      configId: params.configId,
      status: params.status,
      message: params.message,
      latencyMs: params.latencyMs,
    }),
    exitCode: null,
    durationMs: params.latencyMs ?? null,
    severity,
    metadata: {
      connectorId: params.connectorId,
      configId: params.configId,
      status: params.status,
      ...(params.metadata ?? {}),
    },
  });
}

/**
 * Get error recovery hint for connector error codes.
 */
function getConnectorErrorRecovery(errorCode: string): string {
  switch (errorCode) {
    case 'auth_failure':
      return 'Check your credentials in connector settings and re-authenticate if needed.';
    case 'permission_denied':
      return 'Verify that your account has the required permissions for this operation.';
    case 'rate_limit':
      return 'Wait a moment and retry, or reduce the frequency of connector operations.';
    case 'network_failure':
      return 'Check your network connection and ensure the service is reachable.';
    case 'unsupported_capability':
      return 'This connector does not support the requested operation.';
    case 'not_found':
      return 'Verify the resource identifier and try again.';
    case 'configuration_error':
      return 'Review the connector configuration in settings.';
    default:
      return 'Retry the operation or check connector settings.';
  }
}

/**
 * Get connector artifacts for a run.
 */
export function getConnectorArtifactsForRun(runId: string): RalphArtifact[] {
  const db = getDatabase();
  const artifacts = db.listArtifacts({ runId });
  return artifacts.filter(a =>
    a.type === 'connector_input' ||
    a.type === 'connector_output' ||
    a.type === 'connector_failure' ||
    a.type === 'connector_health'
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Artifact Retrieval
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get all artifacts for a run.
 */
export function getArtifactsForRun(runId: string): RalphArtifact[] {
  const db = getDatabase();
  return db.listArtifacts({ runId });
}

/**
 * Get artifacts for a specific iteration.
 */
export function getArtifactsForIteration(runId: string, iteration: number): RalphArtifact[] {
  const db = getDatabase();
  return db.listArtifacts({ runId, iteration });
}

/**
 * Get artifacts for a specific item.
 */
export function getArtifactsForItem(runId: string, itemId: string): RalphArtifact[] {
  const db = getDatabase();
  return db.listArtifacts({ runId, itemId });
}

/**
 * Get the latest artifact of a specific type for a run.
 */
export function getLatestArtifactOfType(runId: string, type: ArtifactType): RalphArtifact | null {
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
  const errors: RalphArtifact[] = [];
  const others: RalphArtifact[] = [];

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
      // Errors are already in toKeep when retainErrors is true, so we only
      // reach here for non-error artifacts. Check age before deletion.
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
    }): RalphArtifact;

    listArtifacts(params: {
      projectId?: string;
      runId?: string;
      iteration?: number;
      itemId?: string | null;
      type?: ArtifactType;
    }): RalphArtifact[];

    getArtifact(id: string): RalphArtifact | null;

    deleteArtifact(id: string): void;

    deleteArtifactsForRun(runId: string): void;
  }
}
