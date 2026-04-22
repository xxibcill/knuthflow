import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { getDatabase } from '../database';
import { checkPolicy, recordPolicyViolation, getPolicySummary } from '../ralph/policyEnforcement';
import type { PolicyRule, PolicyOverride, PolicyAuditEntry, EffectivePolicy } from '../../shared/ralphTypes';

export function registerPolicyHandlers(): void {
  // ─────────────────────────────────────────────────────────────────────────────
  // Policy Rules
  // ─────────────────────────────────────────────────────────────────────────────

  ipcMain.handle('policy:getEffective', async (_event: IpcMainInvokeEvent, projectId: string) => {
    try {
      const policy = getDatabase().getEffectivePolicy(projectId);
      return { success: true, policy };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle('policy:listRules', async (_event: IpcMainInvokeEvent, projectId: string) => {
    try {
      const rules = getDatabase().listPolicyRules(projectId);
      return { success: true, rules };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle('policy:createRule', async (_event: IpcMainInvokeEvent, params: {
    projectId: string;
    type: PolicyRule['type'];
    label: string;
    description: string;
    pattern: string;
    enabled?: boolean;
    scope?: string | null;
    severity?: 'error' | 'warning';
    inheritable?: boolean;
  }) => {
    try {
      const db = getDatabase();
      const validation = db.validatePolicyRule(params);
      if (!validation.valid) {
        return { success: false, error: validation.errors.join(', ') };
      }
      const rule = db.createPolicyRule(params);

      // Audit the policy edit
      db.createPolicyAuditEntry({
        projectId: params.projectId,
        eventType: 'policy_edit',
        entityId: rule.id,
        summary: `Created policy rule: ${rule.label}`,
        metadata: { ruleType: rule.type, pattern: rule.pattern },
      });

      return { success: true, rule };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle('policy:updateRule', async (_event: IpcMainInvokeEvent, id: string, updates: Partial<PolicyRule>) => {
    try {
      const db = getDatabase();
      const existing = db.getPolicyRule(id);
      if (!existing) {
        return { success: false, error: 'Rule not found' };
      }
      const validation = db.validatePolicyRule(updates);
      if (!validation.valid) {
        return { success: false, error: validation.errors.join(', ') };
      }
      const rule = db.updatePolicyRule(id, updates);

      // Audit the policy edit
      db.createPolicyAuditEntry({
        projectId: existing.projectId,
        eventType: 'policy_edit',
        entityId: id,
        summary: `Updated policy rule: ${rule?.label ?? existing.label}`,
        metadata: { updates: Object.keys(updates) },
      });

      return { success: true, rule };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle('policy:deleteRule', async (_event: IpcMainInvokeEvent, id: string) => {
    try {
      const db = getDatabase();
      const existing = db.getPolicyRule(id);
      if (!existing) {
        return { success: false, error: 'Rule not found' };
      }
      const deleted = db.deletePolicyRule(id);

      if (deleted) {
        db.createPolicyAuditEntry({
          projectId: existing.projectId,
          eventType: 'policy_edit',
          entityId: id,
          summary: `Deleted policy rule: ${existing.label}`,
          metadata: { ruleType: existing.type },
        });
      }

      return { success: deleted };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Policy Enforcement
  // ─────────────────────────────────────────────────────────────────────────────

  ipcMain.handle('policy:check', async (_event: IpcMainInvokeEvent, projectId: string, enforcementPoint: string, action: string, context?: { filePath?: string; command?: string }) => {
    try {
      const result = checkPolicy(projectId, enforcementPoint as any, action, context);
      return { success: true, ...result };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle('policy:getSummary', async (_event: IpcMainInvokeEvent, projectId: string) => {
    try {
      const summary = getPolicySummary(projectId);
      return { success: true, summary };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Policy Overrides
  // ─────────────────────────────────────────────────────────────────────────────

  ipcMain.handle('policy:createOverride', async (_event: IpcMainInvokeEvent, params: {
    projectId: string;
    ruleId: string;
    action: string;
    reason: string;
    scope: PolicyOverride['scope'];
    expiresAt?: number | null;
  }) => {
    try {
      const override = getDatabase().createPolicyOverride(params);
      return { success: true, override };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle('policy:listOverrides', async (_event: IpcMainInvokeEvent, projectId: string) => {
    try {
      const overrides = getDatabase().listPolicyOverrides(projectId);
      return { success: true, overrides };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle('policy:pendingOverrides', async (_event: IpcMainInvokeEvent, projectId: string) => {
    try {
      const overrides = getDatabase().listPendingPolicyOverrides(projectId);
      return { success: true, overrides };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle('policy:approveOverride', async (_event: IpcMainInvokeEvent, id: string, approver: string) => {
    try {
      const db = getDatabase();
      const existing = db.getPolicyOverride(id);
      if (!existing) {
        return { success: false, error: 'Override not found' };
      }
      const override = db.updatePolicyOverride(id, {
        status: 'approved',
        approver,
      });

      // Audit the approval
      db.createPolicyAuditEntry({
        projectId: existing.projectId,
        eventType: 'override_approved',
        entityId: id,
        summary: `Approved override for rule: ${existing.ruleId}`,
        metadata: { scope: existing.scope, approver },
      });

      return { success: true, override };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle('policy:rejectOverride', async (_event: IpcMainInvokeEvent, id: string, approver: string) => {
    try {
      const db = getDatabase();
      const existing = db.getPolicyOverride(id);
      if (!existing) {
        return { success: false, error: 'Override not found' };
      }
      const override = db.updatePolicyOverride(id, {
        status: 'rejected',
        approver,
      });

      // Audit the rejection
      db.createPolicyAuditEntry({
        projectId: existing.projectId,
        eventType: 'override_rejected',
        entityId: id,
        summary: `Rejected override for rule: ${existing.ruleId}`,
        metadata: { scope: existing.scope, approver },
      });

      return { success: true, override };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Policy Audit
  // ─────────────────────────────────────────────────────────────────────────────

  ipcMain.handle('policy:listAuditEntries', async (_event: IpcMainInvokeEvent, projectId: string, limit?: number) => {
    try {
      const entries = getDatabase().listPolicyAuditEntries(projectId, limit ?? 100);
      return { success: true, entries };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });
}
