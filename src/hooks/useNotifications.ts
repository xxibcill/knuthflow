import { useState, useCallback } from 'react';

export interface Notification {
  id: string;
  type: 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: number;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback((type: Notification['type'], title: string, message: string) => {
    const id = `notif-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    setNotifications(prev => [...prev, { id, type, title, message, timestamp: Date.now() }]);
    // Auto-dismiss after 8 seconds for errors, 5 seconds for others
    const timeout = type === 'error' ? 8000 : 5000;
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, timeout);
  }, []);

  const dismissNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  return {
    notifications,
    addNotification,
    dismissNotification,
  };
}
