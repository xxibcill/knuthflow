import { useEffect, useState, Component, ReactNode } from 'react';
import type { ConnectorManifest, ConnectorConfig, ConnectorHealth } from '../../shared/preloadTypes';

// ─────────────────────────────────────────────────────────────────────────────
// Error Boundary
// ─────────────────────────────────────────────────────────────────────────────

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ConnectorSettingsErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 border border-red-200 rounded-lg bg-red-50">
          <h3 className="text-red-700 font-medium">Connector Settings Error</h3>
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

const HEALTH_STATUS_LABELS: Record<string, { label: string; className: string }> = {
  healthy: { label: 'Healthy', className: 'badge-success' },
  degraded: { label: 'Degraded', className: 'badge-warning' },
  error: { label: 'Error', className: 'badge-danger' },
  needs_auth: { label: 'Needs Auth', className: 'badge-warning' },
  unknown: { label: 'Unknown', className: 'badge-neutral' },
};

export function ConnectorSettings() {
  const [manifests, setManifests] = useState<ConnectorManifest[]>([]);
  const [configs, setConfigs] = useState<Array<ConnectorConfig & { health?: ConnectorHealth }>>([]);
  const [loading, setLoading] = useState(true);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ status: string; message: string } | null>(null);
  const [editingConfig, setEditingConfig] = useState<string | null>(null);
  const [configForm, setConfigForm] = useState<Record<string, string>>({});

  const loadData = async () => {
    setLoading(true);
    const [manifestsRes, configsRes] = await Promise.all([
      window.knuthflow.connector.listManifests(),
      window.knuthflow.connector.listConfigs(null),
    ]);

    if (manifestsRes.success) setManifests(manifestsRes.connectors);
    if (configsRes.success) setConfigs(configsRes.configs);

    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleTestConnection = async (configId: string) => {
    setTestingId(configId);
    setTestResult(null);
    const res = await window.knuthflow.connector.testConnection(configId);
    if (res.success && res.result) {
      setTestResult({ status: res.result.status, message: res.result.message });
    } else {
      setTestResult({ status: 'error', message: res.error || 'Unknown error' });
    }
    setTestingId(null);
  };

  const handleSaveConfig = async (connectorId: string) => {
    const manifest = manifests.find(m => m.id === connectorId);
    if (!manifest) return;

    // Get current config if exists
    const existing = configs.find(c => c.connectorId === connectorId && !c.projectId);

    await window.knuthflow.connector.saveConfig({
      connectorId,
      projectId: null,
      scope: 'global',
      enabled: true,
      configValues: configForm,
    });

    setEditingConfig(null);
    setConfigForm({});
    await loadData();
  };

  const handleDeleteConfig = async (configId: string) => {
    await window.knuthflow.connector.deleteConfig(configId);
    await loadData();
  };

  const getConfigForConnector = (connectorId: string): (ConnectorConfig & { health?: ConnectorHealth }) | undefined => {
    return configs.find(c => c.connectorId === connectorId && !c.projectId);
  };

  const hasGlobalConfig = (connectorId: string): boolean => {
    return configs.some(c => c.connectorId === connectorId && !c.projectId);
  };

  const getHealthStatus = (config: ConnectorConfig & { health?: ConnectorHealth }) => {
    if (!config.health) return HEALTH_STATUS_LABELS.unknown;
    return HEALTH_STATUS_LABELS[config.health.status] || HEALTH_STATUS_LABELS.unknown;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <span className="text-muted">Loading connectors...</span>
      </div>
    );
  }

  return (
    <div className="section-shell">
      <div className="section-header">
        <div>
          <h2 className="section-title">Connector Settings</h2>
          <p className="section-lead">
            Configure external tool integrations for repository, issue tracking, design sources, registries, and monitoring.
          </p>
        </div>
      </div>

      <div className="list-pane">
        <div className="stack-lg">
          {/* Built-in Connectors */}
          {manifests.map(manifest => {
            const config = getConfigForConnector(manifest.id);
            const isEditing = editingConfig === manifest.id;
            const healthStatus = config?.health ? getHealthStatus(config) : HEALTH_STATUS_LABELS.unknown;

            return (
              <div key={manifest.id} className="surface-panel-muted p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-base font-semibold">{manifest.name}</h3>
                      {config && (
                        <span className={`badge ${healthStatus.className}`}>
                          {healthStatus.label}
                        </span>
                      )}
                      {config?.enabled === false && (
                        <span className="badge badge-neutral">Disabled</span>
                      )}
                    </div>
                    <p className="text-sm text-muted mb-2">{manifest.description}</p>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {manifest.capabilities.map(cap => (
                        <span key={cap} className="badge badge-neutral text-xs">{cap}</span>
                      ))}
                    </div>
                    {config?.health && (
                      <p className="text-xs text-muted">
                        Last checked: {config.health.lastCheckedAt
                          ? new Date(config.health.lastCheckedAt).toLocaleString()
                          : 'Never'}
                      </p>
                    )}
                  </div>
                  <div className="toolbar-inline">
                    {config && (
                      <>
                        <button
                          className="btn"
                          onClick={() => handleTestConnection(config.id)}
                          disabled={testingId === config.id}
                        >
                          {testingId === config.id ? 'Testing...' : 'Test'}
                        </button>
                        <button
                          className="btn btn-danger"
                          onClick={() => handleDeleteConfig(config.id)}
                        >
                          Remove
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Test Result */}
                {testResult && editingConfig === null && (
                  <div className={`surface-panel p-3 mb-3 ${
                    testResult.status === 'healthy' ? 'border-success' :
                    testResult.status === 'error' ? 'border-danger' : 'border-warning'
                  }`}>
                    <p className="text-sm">
                      <span className="font-semibold">
                        {HEALTH_STATUS_LABELS[testResult.status]?.label || testResult.status}:
                      </span>{' '}
                      {testResult.message}
                    </p>
                  </div>
                )}

                {/* Configuration Form */}
                {isEditing ? (
                  <div className="surface-panel p-4 border border-primary">
                    <h4 className="text-sm font-semibold mb-3">Configure {manifest.name}</h4>
                    <div className="stack-sm mb-4">
                      {manifest.configSchema.map(field => (
                        <div key={field.key}>
                          <label className="field-label">
                            {field.label}
                            {field.required && <span className="text-danger"> *</span>}
                          </label>
                          {field.type === 'select' && field.options ? (
                            <select
                              className="input"
                              value={configForm[field.key] || config?.configValues[field.key] || ''}
                              onChange={e => setConfigForm({ ...configForm, [field.key]: e.target.value })}
                            >
                              <option value="">Select...</option>
                              {field.options.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                              ))}
                            </select>
                          ) : field.type === 'boolean' ? (
                            <input
                              type="checkbox"
                              checked={configForm[field.key] === 'true' || config?.configValues[field.key] === 'true'}
                              onChange={e => setConfigForm({ ...configForm, [field.key]: String(e.target.checked) })}
                            />
                          ) : field.type === 'password' || field.secret ? (
                            <input
                              type="password"
                              className="input"
                              value={configForm[field.key] || ''}
                              onChange={e => setConfigForm({ ...configForm, [field.key]: e.target.value })}
                              placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
                            />
                          ) : (
                            <input
                              type={field.type === 'number' ? 'number' : 'text'}
                              className="input"
                              value={configForm[field.key] || config?.configValues[field.key] || ''}
                              onChange={e => setConfigForm({ ...configForm, [field.key]: e.target.value })}
                              placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
                            />
                          )}
                          {field.description && (
                            <p className="text-xs text-muted mt-1">{field.description}</p>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="toolbar-inline">
                      <button
                        className="btn btn-primary"
                        onClick={() => handleSaveConfig(manifest.id)}
                      >
                        Save Configuration
                      </button>
                      <button
                        className="btn"
                        onClick={() => {
                          setEditingConfig(null);
                          setConfigForm({});
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : config ? (
                  <div>
                    {Object.keys(config.configValues).length > 0 && (
                      <div className="text-sm">
                        <p className="text-muted mb-2">Current configuration:</p>
                        <div className="grid grid-cols-2 gap-2">
                          {Object.entries(config.configValues).map(([key, value]) => (
                            <div key={key} className="flex justify-between p-2 bg-surface-dim rounded text-xs">
                              <span className="text-muted">{key}:</span>
                              <span className="font-mono">
                                {key.toLowerCase().includes('secret') ||
                                 key.toLowerCase().includes('token') ||
                                 key.toLowerCase().includes('password') ||
                                 key.toLowerCase().includes('key') ||
                                 key.toLowerCase().includes('auth')
                                  ? '********' : value}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    className="btn btn-primary mt-2"
                    onClick={() => {
                      // Initialize form with defaults
                      const defaults: Record<string, string> = {};
                      manifest.configSchema.forEach(f => {
                        if (f.defaultValue !== undefined) {
                          defaults[f.key] = String(f.defaultValue);
                        }
                      });
                      setConfigForm(defaults);
                      setEditingConfig(manifest.id);
                    }}
                  >
                    Configure
                  </button>
                )}
              </div>
            );
          })}

          {manifests.length === 0 && (
            <div className="surface-panel-muted p-5 text-center">
              <p className="text-muted">No connectors available.</p>
            </div>
          )}
        </div>

        {/* Permission Requirements */}
        <div className="mt-6">
          <h3 className="text-sm font-semibold mb-3">Permission Requirements</h3>
          <div className="surface-panel-muted p-4">
            <p className="text-sm text-muted mb-3">
              Before enabling connectors, ensure your policy grants the required permissions.
              Connector actions are governed by project policy rules of type <code>connector_access</code>.
            </p>
            <div className="flex flex-wrap gap-2">
              {Array.from(new Set(manifests.flatMap(m => m.permissionRequirements))).map(perm => (
                <span key={perm} className="badge badge-neutral text-xs">{perm}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ConnectorSettingsWithErrorBoundary() {
  return (
    <ConnectorSettingsErrorBoundary>
      <ConnectorSettings />
    </ConnectorSettingsErrorBoundary>
  );
}

export default ConnectorSettingsWithErrorBoundary;
