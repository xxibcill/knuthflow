import { useEffect, useState, Component, ReactNode } from 'react';
import type { PolicyRule, PolicyOverride, PolicyAuditEntry, EffectivePolicy } from '../../shared/preloadTypes';

// ─────────────────────────────────────────────────────────────────────────────
// Error Boundary
// ─────────────────────────────────────────────────────────────────────────────

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class PolicySettingsErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 border border-red-200 rounded-lg bg-red-50">
          <h3 className="text-red-700 font-medium">Policy Settings Error</h3>
          <p className="text-red-600 text-sm mt-1">{this.state.error?.message}</p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-3 px-3 py-1.5 text-sm border border-red-300 rounded hover:bg-red-100"
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

interface PolicySettingsProps {
  projectId: string;
  projectName?: string;
}

type RuleType = PolicyRule['type'];
type OverrideStatus = PolicyOverride['status'];
type Scope = PolicyOverride['scope'];

const RULE_TYPE_LABELS: Record<RuleType, string> = {
  protected_path: 'Protected Path',
  forbidden_command: 'Forbidden Command',
  dependency_limit: 'Dependency Limit',
  connector_access: 'Connector Access',
  delivery_gate: 'Delivery Gate',
  approval_required: 'Approval Required',
};

const SCOPE_LABELS: Record<Scope, string> = {
  command: 'Single Command',
  file: 'Single File',
  run: 'One Run Session',
  delivery: 'One Delivery',
  permanent: 'Permanent',
};

export function PolicySettings({ projectId, projectName }: PolicySettingsProps) {
  const [policy, setPolicy] = useState<EffectivePolicy | null>(null);
  const [rules, setRules] = useState<PolicyRule[]>([]);
  const [overrides, setOverrides] = useState<PolicyOverride[]>([]);
  const [auditEntries, setAuditEntries] = useState<PolicyAuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingRule, setEditingRule] = useState<PolicyRule | null>(null);
  const [showAddRule, setShowAddRule] = useState(false);
  const [pendingOverrides, setPendingOverrides] = useState<PolicyOverride[]>([]);
  const [activeTab, setActiveTab] = useState<'rules' | 'overrides' | 'audit'>('rules');

  // Form state for new/edit rule
  const [formType, setFormType] = useState<RuleType>('protected_path');
  const [formLabel, setFormLabel] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formPattern, setFormPattern] = useState('');
  const [formSeverity, setFormSeverity] = useState<'error' | 'warning'>('error');
  const [formEnabled, setFormEnabled] = useState(true);
  const [formInheritable, setFormInheritable] = useState(true);
  const [formScope, setFormScope] = useState<string | null>(null);

  // Override approval form
  const [overrideReason, setOverrideReason] = useState('');
  const [approverName, setApproverName] = useState('');

  const loadData = async () => {
    setLoading(true);
    const [policyRes, rulesRes, overridesRes, pendingRes, auditRes] = await Promise.all([
      window.knuthflow.policy.getEffective(projectId),
      window.knuthflow.policy.listRules(projectId),
      window.knuthflow.policy.listOverrides(projectId),
      window.knuthflow.policy.pendingOverrides(projectId),
      window.knuthflow.policy.listAuditEntries(projectId, 50),
    ]);

    if (policyRes.success) setPolicy(policyRes.policy);
    if (rulesRes.success) setRules(rulesRes.rules);
    if (overridesRes.success) setOverrides(overridesRes.overrides);
    if (pendingRes.success) setPendingOverrides(pendingRes.overrides);
    if (auditRes.success) setAuditEntries(auditRes.entries);

    setLoading(false);
  };

  useEffect(() => {
    if (projectId) loadData();
  }, [projectId]);

  const resetForm = () => {
    setFormType('protected_path');
    setFormLabel('');
    setFormDescription('');
    setFormPattern('');
    setFormSeverity('error');
    setFormEnabled(true);
    setFormInheritable(true);
    setFormScope(null);
    setEditingRule(null);
    setShowAddRule(false);
  };

  const handleSaveRule = async () => {
    if (!formLabel.trim() || !formPattern.trim()) return;

    if (editingRule) {
      const res = await window.knuthflow.policy.updateRule(editingRule.id, {
        type: formType,
        label: formLabel,
        description: formDescription,
        pattern: formPattern,
        severity: formSeverity,
        enabled: formEnabled,
        inheritable: formInheritable,
        scope: formScope,
      });
      if (res.success) {
        await loadData();
        resetForm();
      }
    } else {
      const res = await window.knuthflow.policy.createRule({
        projectId,
        type: formType,
        label: formLabel,
        description: formDescription,
        pattern: formPattern,
        severity: formSeverity,
        enabled: formEnabled,
        inheritable: formInheritable,
        scope: formScope,
      });
      if (res.success) {
        await loadData();
        resetForm();
      }
    }
  };

  const handleDeleteRule = async (id: string) => {
    const res = await window.knuthflow.policy.deleteRule(id);
    if (res.success) {
      await loadData();
    }
  };

  const handleApproveOverride = async (id: string) => {
    if (!approverName.trim()) return;
    const res = await window.knuthflow.policy.approveOverride(id, approverName);
    if (res.success) {
      await loadData();
      setOverrideReason('');
      setApproverName('');
    }
  };

  const handleRejectOverride = async (id: string) => {
    if (!approverName.trim()) return;
    const res = await window.knuthflow.policy.rejectOverride(id, approverName);
    if (res.success) {
      await loadData();
      setOverrideReason('');
      setApproverName('');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <span className="text-muted">Loading policy...</span>
      </div>
    );
  }

  const enabledCount = rules.filter(r => r.enabled).length;

  return (
    <div className="section-shell">
      <div className="section-header">
        <div>
          <h2 className="section-title">Policy Settings</h2>
          <p className="section-lead">
            {projectName ? `${projectName} — ` : ''}
            Govern what Ralph can change, what requires approval, and what is forbidden.
          </p>
        </div>
        <div className="toolbar-inline">
          <span className="badge badge-neutral">{enabledCount}/{rules.length} rules active</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-bar">
        <button
          className={`tab-btn ${activeTab === 'rules' ? 'active' : ''}`}
          onClick={() => setActiveTab('rules')}
        >
          Rules
        </button>
        <button
          className={`tab-btn ${activeTab === 'overrides' ? 'active' : ''}`}
          onClick={() => setActiveTab('overrides')}
        >
          Overrides {pendingOverrides.length > 0 && <span className="badge badge-warning">{pendingOverrides.length}</span>}
        </button>
        <button
          className={`tab-btn ${activeTab === 'audit' ? 'active' : ''}`}
          onClick={() => setActiveTab('audit')}
        >
          Audit Log
        </button>
      </div>

      {/* Rules Tab */}
      {activeTab === 'rules' && (
        <div className="list-pane">
          <div className="stack-lg">
            {rules.length === 0 ? (
              <div className="surface-panel-muted p-5 text-center">
                <p className="text-muted">No policy rules defined.</p>
              </div>
            ) : (
              rules.map(rule => (
                <div key={rule.id} className="surface-panel-muted p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`badge ${rule.enabled ? 'badge-success' : 'badge-neutral'}`}>
                          {rule.enabled ? 'Active' : 'Disabled'}
                        </span>
                        <span className={`badge ${rule.severity === 'error' ? 'badge-danger' : 'badge-warning'}`}>
                          {rule.severity}
                        </span>
                        <span className="text-sm text-muted">{RULE_TYPE_LABELS[rule.type]}</span>
                        {rule.inheritable && <span className="badge badge-neutral">inheritable</span>}
                      </div>
                      <h3 className="text-base font-semibold mb-1">{rule.label}</h3>
                      <p className="text-sm text-muted mb-2">{rule.description}</p>
                      <code className="text-xs bg-surface-dim p-1 rounded">{rule.pattern}</code>
                    </div>
                    <div className="toolbar-inline">
                      <button
                        className="btn"
                        onClick={() => {
                          setEditingRule(rule);
                          setFormType(rule.type);
                          setFormLabel(rule.label);
                          setFormDescription(rule.description);
                          setFormPattern(rule.pattern);
                          setFormSeverity(rule.severity);
                          setFormEnabled(rule.enabled);
                          setFormInheritable(rule.inheritable);
                          setFormScope(rule.scope);
                          setShowAddRule(true);
                        }}
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-danger"
                        onClick={() => handleDeleteRule(rule.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Add/Edit Rule Form */}
          {showAddRule && (
            <div className="surface-panel p-5 border border-primary">
              <h3 className="text-base font-semibold mb-4">
                {editingRule ? 'Edit Rule' : 'Add Policy Rule'}
              </h3>
              <div className="stack-sm mb-4">
                <label className="field-label">Rule Type</label>
                <select
                  className="input"
                  value={formType}
                  onChange={e => setFormType(e.target.value as RuleType)}
                >
                  {Object.entries(RULE_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              <div className="stack-sm mb-4">
                <label className="field-label">Label</label>
                <input
                  className="input"
                  value={formLabel}
                  onChange={e => setFormLabel(e.target.value)}
                  placeholder="Short human-readable label"
                />
              </div>

              <div className="stack-sm mb-4">
                <label className="field-label">Description</label>
                <textarea
                  className="input"
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  placeholder="What this rule protects or restricts"
                  rows={2}
                />
              </div>

              <div className="stack-sm mb-4">
                <label className="field-label">Pattern (glob or regex)</label>
                <input
                  className="input"
                  value={formPattern}
                  onChange={e => setFormPattern(e.target.value)}
                  placeholder="e.g., package.json or rm -rf"
                />
              </div>

              <div className="flex gap-4 mb-4">
                <div className="flex-1 stack-sm">
                  <label className="field-label">Severity</label>
                  <select
                    className="input"
                    value={formSeverity}
                    onChange={e => setFormSeverity(e.target.value as 'error' | 'warning')}
                  >
                    <option value="error">Error (blocks action)</option>
                    <option value="warning">Warning (logs only)</option>
                  </select>
                </div>
                <div className="flex-1 stack-sm">
                  <label className="field-label">Scope (optional)</label>
                  <select
                    className="input"
                    value={formScope ?? ''}
                    onChange={e => setFormScope(e.target.value || null)}
                  >
                    <option value="">Global</option>
                    {Object.entries(SCOPE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-4 mb-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formEnabled}
                    onChange={e => setFormEnabled(e.target.checked)}
                  />
                  <span>Enabled</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formInheritable}
                    onChange={e => setFormInheritable(e.target.checked)}
                  />
                  <span>Inheritable by child projects</span>
                </label>
              </div>

              <div className="toolbar-inline">
                <button className="btn btn-primary" onClick={handleSaveRule}>
                  {editingRule ? 'Update Rule' : 'Add Rule'}
                </button>
                <button className="btn" onClick={resetForm}>Cancel</button>
              </div>
            </div>
          )}

          {!showAddRule && (
            <button className="btn btn-primary mt-4" onClick={() => setShowAddRule(true)}>
              Add Rule
            </button>
          )}
        </div>
      )}

      {/* Overrides Tab */}
      {activeTab === 'overrides' && (
        <div className="list-pane">
          <div className="stack-lg">
            {pendingOverrides.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-warning mb-3">Pending Approval</h3>
                {pendingOverrides.map(ov => (
                  <div key={ov.id} className="surface-panel-warning p-4 mb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-semibold mb-1">Override Request</p>
                        <p className="text-sm text-muted mb-1">Rule: {ov.ruleId}</p>
                        <p className="text-sm mb-2">Action: {ov.action}</p>
                        <p className="text-sm text-muted mb-2">Reason: {ov.reason}</p>
                        <p className="text-xs text-muted">Scope: {SCOPE_LABELS[ov.scope]} — Expires: {ov.expiresAt ? new Date(ov.expiresAt).toLocaleString() : 'Never'}</p>
                      </div>
                      <div className="toolbar-inline">
                        <button
                          className="btn btn-primary"
                          onClick={() => handleApproveOverride(ov.id)}
                        >
                          Approve
                        </button>
                        <button
                          className="btn btn-danger"
                          onClick={() => handleRejectOverride(ov.id)}
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div>
              <h3 className="text-sm font-semibold mb-3">Override History</h3>
              {overrides.length === 0 ? (
                <div className="surface-panel-muted p-4 text-center">
                  <p className="text-muted text-sm">No overrides recorded.</p>
                </div>
              ) : (
                overrides.map(ov => (
                  <div key={ov.id} className="surface-panel-muted p-4 mb-2">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`badge ${
                        ov.status === 'approved' ? 'badge-success' :
                        ov.status === 'rejected' ? 'badge-danger' :
                        ov.status === 'expired' ? 'badge-neutral' : 'badge-warning'
                      }`}>
                        {ov.status}
                      </span>
                      <span className="text-sm">{SCOPE_LABELS[ov.scope]}</span>
                      <span className="text-xs text-muted">{new Date(ov.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="text-sm text-muted">Rule: {ov.ruleId}</p>
                    <p className="text-sm text-muted">Action: {ov.action}</p>
                    {ov.approver && <p className="text-xs text-muted">By: {ov.approver}</p>}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Audit Log Tab */}
      {activeTab === 'audit' && (
        <div className="list-pane">
          {auditEntries.length === 0 ? (
            <div className="surface-panel-muted p-4 text-center">
              <p className="text-muted">No audit entries yet.</p>
            </div>
          ) : (
            <div className="stack-sm">
              {auditEntries.map(entry => (
                <div key={entry.id} className="surface-panel-muted p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`badge badge-neutral`}>
                      {entry.eventType.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-muted">{new Date(entry.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="text-sm">{entry.summary}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function PolicySettingsWithErrorBoundary(props: PolicySettingsProps) {
  return (
    <PolicySettingsErrorBoundary>
      <PolicySettings {...props} />
    </PolicySettingsErrorBoundary>
  );
}

export default PolicySettingsWithErrorBoundary;
