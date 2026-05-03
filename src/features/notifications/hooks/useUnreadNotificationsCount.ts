import { useCallback, useEffect, useState } from 'react';
import type { NotificationUnreadCount } from '../types/notification.types';
import { getUnreadCount } from '@/shared/services/notificationService';
import { NOTIFICATION_WINDOW_EVENTS } from '../constants/notification-events.constants';

export function useUnreadNotificationsCount() {
  const [count, setCount] = useState<NotificationUnreadCount>({ unread: 0, unseen: 0 });
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    const next = await getUnreadCount();
    setCount(next);
    setLoading(false);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    const handleCountUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<NotificationUnreadCount>;
      if (customEvent.detail) {
        setCount(customEvent.detail);
      }
    };

    const handleRefresh = () => {
      void reload();
    };

    window.addEventListener(
      NOTIFICATION_WINDOW_EVENTS.unreadCountUpdated,
      handleCountUpdated as EventListener,
    );
    window.addEventListener(NOTIFICATION_WINDOW_EVENTS.refresh, handleRefresh);

    return () => {
      window.removeEventListener(
        NOTIFICATION_WINDOW_EVENTS.unreadCountUpdated,
        handleCountUpdated as EventListener,
      );
      window.removeEventListener(NOTIFICATION_WINDOW_EVENTS.refresh, handleRefresh);
    };
  }, [reload]);

  return { count, loading, reload };
}
