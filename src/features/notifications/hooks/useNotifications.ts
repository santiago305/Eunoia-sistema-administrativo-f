import { useCallback, useEffect, useState } from 'react';
import type { NotificationRecipientItem, NotificationUnreadCount } from '../types/notification.types';
import {
  getUnreadCount,
  listMyNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from '@/shared/services/notificationService';
import { NOTIFICATION_WINDOW_EVENTS } from '../constants/notification-events.constants';

export function useNotifications() {
  const [items, setItems] = useState<NotificationRecipientItem[]>([]);
  const [count, setCount] = useState<NotificationUnreadCount>({ unread: 0, unseen: 0 });
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    const [notifications, unreadCount] = await Promise.all([
      listMyNotifications({ limit: 40 }),
      getUnreadCount(),
    ]);
    setItems(notifications);
    setCount(unreadCount);
    setLoading(false);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    const handleRefresh = () => {
      void reload();
    };

    const handleUnreadCountUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<NotificationUnreadCount>;
      if (customEvent.detail) {
        setCount(customEvent.detail);
      }
    };

    window.addEventListener(NOTIFICATION_WINDOW_EVENTS.refresh, handleRefresh);
    window.addEventListener(NOTIFICATION_WINDOW_EVENTS.unreadCountUpdated, handleUnreadCountUpdated as EventListener);

    return () => {
      window.removeEventListener(NOTIFICATION_WINDOW_EVENTS.refresh, handleRefresh);
      window.removeEventListener(
        NOTIFICATION_WINDOW_EVENTS.unreadCountUpdated,
        handleUnreadCountUpdated as EventListener,
      );
    };
  }, [reload]);

  const markOneAsRead = useCallback(async (recipientId: string) => {
    const updated = await markNotificationAsRead(recipientId);
    setItems((prev) => prev.map((item) => (item.recipientId === recipientId ? updated : item)));
    setCount(await getUnreadCount());
  }, []);

  const markAllAsRead = useCallback(async () => {
    await markAllNotificationsAsRead();
    await reload();
  }, [reload]);

  return {
    items,
    count,
    loading,
    reload,
    markOneAsRead,
    markAllAsRead,
  };
}
