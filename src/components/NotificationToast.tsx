import type { Notification } from '../hooks/useNotifications';

interface NotificationToastProps {
  notifications: Notification[];
  onDismiss: (id: string) => void;
}

function getToastMeta(type: Notification['type']) {
  if (type === 'error') {
    return {
      className: 'error',
      iconClassName: 'text-red-400',
      titleClassName: 'text-red-200',
      bodyClassName: 'text-red-300',
      iconPath: 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    };
  }

  if (type === 'warning') {
    return {
      className: 'warning',
      iconClassName: 'text-yellow-400',
      titleClassName: 'text-yellow-200',
      bodyClassName: 'text-yellow-300',
      iconPath: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
    };
  }

  return {
    className: 'info',
    iconClassName: 'text-blue-400',
    titleClassName: 'text-blue-200',
    bodyClassName: 'text-blue-300',
    iconPath: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  };
}

export function NotificationToast({ notifications, onDismiss }: NotificationToastProps) {
  if (notifications.length === 0) return null;

  return (
    <div className="toast-stack">
      {notifications.map(notification => {
        const meta = getToastMeta(notification.type);

        return (
          <div key={notification.id} className={`toast ${meta.className}`}>
            <div className="mt-0.5 flex-shrink-0">
              <svg className={`h-5 w-5 ${meta.iconClassName}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={meta.iconPath} />
              </svg>
            </div>

            <div className="min-w-0 flex-1">
              <p className={`m-0 text-sm font-semibold ${meta.titleClassName}`}>{notification.title}</p>
              <p className={`mt-1 text-xs leading-5 ${meta.bodyClassName}`}>{notification.message}</p>
            </div>

            <button onClick={() => onDismiss(notification.id)} className="btn btn-ghost btn-icon" title="Dismiss">
              <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        );
      })}
    </div>
  );
}
