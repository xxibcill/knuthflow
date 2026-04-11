import type { SafetyAlert } from './RalphConsole.types';

interface RalphSafetyAlertsProps {
  alerts: SafetyAlert[];
  onDismiss?: (alertId: string) => void;
  onViewDetails?: (alert: SafetyAlert) => void;
}

function getAlertBadge(severity: SafetyAlert['severity']) {
  if (severity === 'critical') return 'badge badge-danger';
  if (severity === 'warning') return 'badge badge-warning';
  if (severity === 'info') return 'badge badge-info';
  return 'badge badge-neutral';
}

export function RalphSafetyAlerts({ alerts, onDismiss, onViewDetails }: RalphSafetyAlertsProps) {
  const formatTimestamp = (timestamp: number) => (
    new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  );

  if (alerts.length === 0) {
    return (
      <div className="empty-state">
        <div>
          <h3 className="text-lg font-semibold">No safety alerts</h3>
          <p className="mt-2 text-sm text-muted">Safety events will surface here when a run trips a circuit or needs intervention.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="section-shell">
      <div className="section-header">
        <div>
          <h2 className="section-title">Safety Alerts</h2>
          <p className="section-lead">Operational warnings and stops requiring review or acknowledgement.</p>
        </div>
        <div className="toolbar-inline">
          <span className="badge badge-danger">{alerts.filter(alert => alert.severity === 'critical').length} critical</span>
          <span className="badge badge-neutral">{alerts.length} total</span>
        </div>
      </div>

      <div className="list-pane">
        <div className="stack-sm">
          {alerts.map(alert => (
            <div key={alert.id} className="list-card">
              <div className="min-w-0 flex-1">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <h3 className="list-card-title truncate">{alert.title}</h3>
                    <span className={getAlertBadge(alert.severity)}>{alert.severity}</span>
                  </div>
                  <span className="text-xs text-muted">{formatTimestamp(alert.timestamp)}</span>
                </div>
                <p className="text-sm text-muted">{alert.message}</p>
                {alert.canResume && <p className="mt-2 text-xs text-green-400">Run can resume after acknowledgement.</p>}
              </div>

              <div className="toolbar-inline">
                {onViewDetails && (
                  <button onClick={() => onViewDetails(alert)} className="btn">
                    Details
                  </button>
                )}
                {onDismiss && (
                  <button onClick={() => onDismiss(alert.id)} className="btn">
                    Dismiss
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
