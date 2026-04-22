import { getDatabase } from '../database';
import type { PolicyRule, PolicyOverride, EffectivePolicy } from '../../shared/ralphTypes';

export type PolicyEnforcementPoint = 'command' | 'file_write' | 'dependency_update' | 'connector_call' | 'packaging' | 'delivery';

export interface PolicyViolation {
  ruleId: string;
  ruleLabel: string;
  ruleType: PolicyRule['type'];
  severity: 'error' | 'warning';
  message: string;
  enforcementPoint: PolicyEnforcementPoint;
  /** What action was being attempted */
  action: string;
  /** What override ID could permit this, if any */
  overrideableBy: string | null;
  /** Recovery suggestions for the operator */
  recovery: string;
}

export interface PolicyCheckResult {
  allowed: boolean;
  violations: PolicyViolation[];
}

/**
 * Check if an action is allowed by the effective policy
 */
export function checkPolicy(
  projectId: string,
  enforcementPoint: PolicyEnforcementPoint,
  action: string,
  context?: { filePath?: string; command?: string }
): PolicyCheckResult {
  const db = getDatabase();
  const policy = db.getEffectivePolicy(projectId);

  if (!policy) {
    // No policy = everything allowed (safe default)
    return { allowed: true, violations: [] };
  }

  const violations: PolicyViolation[] = [];

  for (const rule of policy.rules) {
    if (!rule.enabled) continue;

    // Check if this rule applies to this enforcement point
    if (!ruleAppliesToEnforcementPoint(rule, enforcementPoint, action, context)) {
      continue;
    }

    // Check if this action matches the rule pattern
    if (!actionMatchesPattern(action, rule.pattern, context?.filePath)) {
      continue;
    }

    // Check if there's an active override for this rule
    const activeOverride = policy.overrides.find(
      o => o.ruleId === rule.id && o.status === 'approved'
    );

    if (activeOverride) {
      // Override exists but check scope
      if (scopePermitsAction(activeOverride.scope, enforcementPoint)) {
        continue; // Override covers this action
      }
    }

    // No valid override - this is a violation
    violations.push({
      ruleId: rule.id,
      ruleLabel: rule.label,
      ruleType: rule.type,
      severity: rule.severity,
      message: buildViolationMessage(rule, action, context),
      enforcementPoint,
      action,
      overrideableBy: activeOverride ? activeOverride.id : null,
      recovery: buildRecovery(rule, enforcementPoint),
    });
  }

  // If any error-level violations, block the action
  const blocked = violations.some(v => v.severity === 'error');
  return {
    allowed: !blocked,
    violations,
  };
}

/**
 * Record a policy violation as an audit entry and return structured error
 */
export function recordPolicyViolation(
  projectId: string,
  violation: PolicyViolation
): void {
  const db = getDatabase();
  db.createPolicyAuditEntry({
    projectId,
    eventType: 'blocked_action',
    entityId: violation.ruleId,
    summary: `Blocked ${violation.enforcementPoint}: ${violation.message}`,
    metadata: {
      ruleType: violation.ruleType,
      enforcementPoint: violation.enforcementPoint,
      action: violation.action,
      severity: violation.severity,
    },
  });
}

/**
 * Check if a file path is protected
 */
export function isPathProtected(projectId: string, filePath: string): boolean {
  const result = checkPolicy(projectId, 'file_write', filePath, { filePath });
  return !result.allowed;
}

/**
 * Check if a command is allowed
 */
export function isCommandAllowed(projectId: string, command: string): PolicyCheckResult {
  return checkPolicy(projectId, 'command', command, { command });
}

/**
 * Get effective policy summary for enforcement reporting
 */
export function getPolicySummary(projectId: string): {
  ruleCount: number;
  enabledCount: number;
  activeOverrideCount: number;
} | null {
  const db = getDatabase();
  const policy = db.getEffectivePolicy(projectId);
  if (!policy) return null;

  return {
    ruleCount: policy.rules.length,
    enabledCount: policy.rules.filter(r => r.enabled).length,
    activeOverrideCount: policy.overrides.length,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

function ruleAppliesToEnforcementPoint(
  rule: PolicyRule,
  enforcementPoint: PolicyEnforcementPoint,
  _action: string,
  context?: { filePath?: string; command?: string }
): boolean {
  switch (rule.type) {
    case 'protected_path':
      return enforcementPoint === 'file_write' && !!context?.filePath;
    case 'forbidden_command':
      return enforcementPoint === 'command' && !!context?.command;
    case 'dependency_limit':
      return enforcementPoint === 'dependency_update';
    case 'connector_access':
      return enforcementPoint === 'connector_call';
    case 'delivery_gate':
      return enforcementPoint === 'delivery' || enforcementPoint === 'packaging';
    case 'approval_required':
      // Approval required applies to most enforcement points
      return true;
    default:
      return false;
  }
}

function actionMatchesPattern(action: string, pattern: string, filePath?: string): boolean {
  // Glob-style pattern matching
  // * matches anything, ** matches path separators
  const effectiveTarget = filePath || action;

  // Convert glob pattern to regex
  const regexPattern = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&') // Escape regex special chars except * and **
    .replace(/\*\*/g, '<<DOUBLESTAR>>')
    .replace(/\*/g, '[^/]*')
    .replace(/<<DOUBLESTAR>>/g, '.*');

  try {
    const regex = new RegExp(regexPattern, 'i');
    return regex.test(effectiveTarget);
  } catch {
    // If pattern is not a valid regex, treat as literal substring match
    return effectiveTarget.toLowerCase().includes(pattern.toLowerCase());
  }
}

function scopePermitsAction(scope: PolicyOverride['scope'], enforcementPoint: PolicyEnforcementPoint): boolean {
  switch (scope) {
    case 'permanent':
      return true;
    case 'delivery':
      return enforcementPoint === 'delivery';
    case 'run':
      return enforcementPoint === 'command' || enforcementPoint === 'file_write';
    case 'file':
      return enforcementPoint === 'file_write';
    case 'command':
      return enforcementPoint === 'command';
    default:
      return false;
  }
}

function buildViolationMessage(
  rule: PolicyRule,
  action: string,
  context?: { filePath?: string; command?: string }
): string {
  const target = context?.filePath || context?.command || action;
  switch (rule.type) {
    case 'protected_path':
      return `Protected file cannot be modified: ${target}`;
    case 'forbidden_command':
      return `Forbidden command blocked: ${target}`;
    case 'dependency_limit':
      return `Dependency update not allowed by policy`;
    case 'connector_access':
      return `External connector access not permitted`;
    case 'delivery_gate':
      return `Delivery blocked - required validations not passed`;
    case 'approval_required':
      return `Action requires operator approval: ${target}`;
    default:
      return `Policy violation: ${rule.label}`;
  }
}

function buildRecovery(rule: PolicyRule, enforcementPoint: PolicyEnforcementPoint): string {
  switch (rule.type) {
    case 'protected_path':
      return 'Use the proper update mechanism or request a policy override';
    case 'forbidden_command':
      return 'Use an alternative safe command or request a policy override';
    case 'dependency_limit':
      return 'Update the dependency policy rule to allow this change';
    case 'connector_access':
      return 'Enable connector access in project policy settings';
    case 'delivery_gate':
      return 'Ensure all acceptance gates pass before attempting delivery';
    case 'approval_required':
      return 'Submit an override request for this specific action';
    default:
      return 'Review project policy settings or request an override';
  }
}
