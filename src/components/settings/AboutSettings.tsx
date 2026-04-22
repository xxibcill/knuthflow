import type { SystemDiagnostics } from '../../shared/preloadTypes';

interface AboutSettingsProps {
  diagnostics: SystemDiagnostics | null;
}

export function AboutSettings({ diagnostics }: AboutSettingsProps) {
  return (
    <div className="stack-lg">
      <section className="surface-panel-muted p-8 text-center">
        <p className="brand-kicker">Ralph</p>
        <h1 className="brand-title">Operator Desktop</h1>
        <p className="mt-3 text-sm text-muted">
          Version {diagnostics?.app.version ?? 'Unknown'} • Operator desktop for Ralph-managed build loops
        </p>
      </section>

      <section className="metrics-grid">
        <div className="metric-card">
          <p className="metric-label">Platform</p>
          <p className="metric-value">{navigator.platform}</p>
        </div>
        <div className="metric-card">
          <p className="metric-label">Electron</p>
          <p className="metric-value">{diagnostics?.app.electronVersion ?? 'Unknown'}</p>
        </div>
        <div className="metric-card">
          <p className="metric-label">Node</p>
          <p className="metric-value">{diagnostics?.app.nodeVersion ?? 'Unknown'}</p>
        </div>
      </section>
    </div>
  );
}
