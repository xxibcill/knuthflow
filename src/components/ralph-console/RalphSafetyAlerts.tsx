import type { SafetyAlert } from './RalphConsole.types';

interface RalphSafetyAlertsProps {
  alerts: SafetyAlert[];
  onDismiss?: (alertId: string) => void;
  onViewDetails?: (alert: SafetyAlert) => void;
}

const getAlertIcon = (type: SafetyAlert['type']) => {
  switch (type) {
    case 'circuit_open':
      return 'M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636';
    case 'rate_limit':
      return 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z';
    case 'permission_denied':
      return 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z';
    case 'timeout':
      return 'M12 8v4.5m7.5-6.5l-6.5 6.5m0-6.5l6.5 6.5M12 16.5V19a2 2 0 002 2h4';
    case 'error':
    default:
      return 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z';
  }
};

const getAlertColor = (severity: SafetyAlert['severity']) => {
  switch (severity) {
    case 'critical':
      return {
        bg: 'bg-red-900/50',
        border: 'border-red-700',
        icon: 'text-red-400',
        title: 'text-red-200',
        message: 'text-red-300',
      };
    case 'warning':
      return {
        bg: 'bg-yellow-900/50',
        border: 'border-yellow-700',
        icon: 'text-yellow-400',
        title: 'text-yellow-200',
        message: 'text-yellow-300',
      };
    case 'info':
      return {
        bg: 'bg-blue-900/50',
        border: 'border-blue-700',
        icon: 'text-blue-400',
        title: 'text-blue-200',
        message: 'text-blue-300',
      };
    default:
      return {
        bg: 'bg-gray-900/50',
        border: 'border-gray-700',
        icon: 'text-gray-400',
        title: 'text-gray-200',
        message: 'text-gray-300',
      };
  }
};

const formatTimestamp = (timestamp: number) => {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

export function RalphSafetyAlerts({ alerts, onDismiss, onViewDetails }: RalphSafetyAlertsProps) {
  if (alerts.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 text-sm">
        <div className="text-center">
          <svg className="w-8 h-8 mx-auto mb-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p>No safety alerts</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-white">Safety Alerts</h3>
          {alerts.filter(a => a.severity === 'critical').length > 0 && (
            <span className="px-1.5 py-0.5 bg-red-600 text-white text-xs rounded">
              {alerts.filter(a => a.severity === 'critical').length} critical
            </span>
          )}
        </div>
        <span className="text-xs text-gray-400">{alerts.length} alert{alerts.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Alert list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {alerts.map((alert) => {
          const colors = getAlertColor(alert.severity);

          return (
            <div
              key={alert.id}
              className={`
                p-3 rounded-lg border ${colors.bg} ${colors.border}
                ${alert.severity === 'critical' ? 'animate-pulse' : ''}
              `}
            >
              <div className="flex items-start gap-2">
                {/* Icon */}
                <svg
                  className={`w-5 h-5 flex-shrink-0 mt-0.5 ${colors.icon}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d={getAlertIcon(alert.type)}
                  />
                </svg>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className={`text-sm font-medium ${colors.title}`}>{alert.title}</h4>
                    <span className="text-xs text-gray-500 flex-shrink-0">
                      {formatTimestamp(alert.timestamp)}
                    </span>
                  </div>
                  <p className={`text-xs mt-1 ${colors.message}`}>{alert.message}</p>

                  {/* Resume indicator */}
                  {alert.canResume && (
                    <div className="flex items-center gap-1 mt-2 text-xs text-green-400">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Can Resume
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 mt-2">
                    {onViewDetails && (
                      <button
                        onClick={() => onViewDetails(alert)}
                        className="text-xs text-blue-400 hover:text-blue-300"
                      >
                        View Details
                      </button>
                    )}
                    {onDismiss && (
                      <button
                        onClick={() => onDismiss(alert.id)}
                        className="text-xs text-gray-400 hover:text-gray-300"
                      >
                        Dismiss
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}