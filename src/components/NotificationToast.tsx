import type { Notification } from '../hooks/useNotifications';

interface NotificationToastProps {
  notifications: Notification[];
  onDismiss: (id: string) => void;
}

export function NotificationToast({ notifications, onDismiss }: NotificationToastProps) {
  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-16 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {notifications.map(notif => (
        <div
          key={notif.id}
          className={`flex items-start gap-3 px-4 py-3 rounded-lg shadow-lg ${
            notif.type === 'error'
              ? 'bg-red-900 border border-red-700'
              : notif.type === 'warning'
              ? 'bg-yellow-900 border border-yellow-700'
              : 'bg-blue-900 border border-blue-700'
          }`}
        >
          <div className="flex-shrink-0 mt-0.5">
            {notif.type === 'error' && (
              <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            {notif.type === 'warning' && (
              <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            )}
            {notif.type === 'info' && (
              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium ${
              notif.type === 'error' ? 'text-red-200' : notif.type === 'warning' ? 'text-yellow-200' : 'text-blue-200'
            }`}>
              {notif.title}
            </p>
            <p className={`text-xs mt-1 ${
              notif.type === 'error' ? 'text-red-300' : notif.type === 'warning' ? 'text-yellow-300' : 'text-blue-300'
            }`}>
              {notif.message}
            </p>
          </div>
          <button
            onClick={() => onDismiss(notif.id)}
            className="flex-shrink-0 p-1 hover:opacity-70"
          >
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
