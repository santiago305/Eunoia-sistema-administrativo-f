import { createContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useAuth } from '@/shared/hooks/useAuth';
import { closeNotificationSocket, createNotificationSocket } from '@/shared/lib/socket';
import { NOTIFICATION_SOCKET_EVENTS, NOTIFICATION_WINDOW_EVENTS } from '@/features/notifications/constants/notification-events.constants';
import type { NotificationUnreadCount } from '@/features/notifications/types/notification.types';
import { getUnreadCount } from '@/shared/services/notificationService';
import { showNotificationToast } from '@/features/notifications/services/notification-toast.service';

export const NotificationContext = createContext<{ connected: boolean }>({ connected: false });

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, userId } = useAuth();
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !userId) {
      closeNotificationSocket();
      setConnected(false);
      return;
    }

    const socket = createNotificationSocket(userId);
    if (!socket) return;

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    const onCreated = (payload: { notification?: { title?: string; message?: string; priority?: string; actionUrl?: string; actionLabel?: string } }) => {
      showNotificationToast(payload?.notification);
      window.dispatchEvent(new Event(NOTIFICATION_WINDOW_EVENTS.refresh));
    };

    const onUnreadCountUpdated = (payload: NotificationUnreadCount) => {
      window.dispatchEvent(new CustomEvent(NOTIFICATION_WINDOW_EVENTS.unreadCountUpdated, { detail: payload }));
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on(NOTIFICATION_SOCKET_EVENTS.created, onCreated);
    socket.on(NOTIFICATION_SOCKET_EVENTS.unreadCountUpdated, onUnreadCountUpdated);

    void getUnreadCount().then((payload) => {
      window.dispatchEvent(new CustomEvent(NOTIFICATION_WINDOW_EVENTS.unreadCountUpdated, { detail: payload }));
    });

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off(NOTIFICATION_SOCKET_EVENTS.created, onCreated);
      socket.off(NOTIFICATION_SOCKET_EVENTS.unreadCountUpdated, onUnreadCountUpdated);
      closeNotificationSocket();
      setConnected(false);
    };
  }, [isAuthenticated, userId]);

  const value = useMemo(() => ({ connected }), [connected]);

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}
