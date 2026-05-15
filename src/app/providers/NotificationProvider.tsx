import { createContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useAuth } from '@/shared/hooks/useAuth';
import { closeNotificationSocket, createNotificationSocket } from '@/shared/lib/socket';
import { NOTIFICATION_SOCKET_EVENTS, NOTIFICATION_WINDOW_EVENTS } from '@/features/mail/constants/mail-events.constants';
import type { NotificationPriority, NotificationUnreadCount } from '@/features/mail/types/notification.types';
import { getUnreadCount } from '@/shared/services/notificationService';
import { showNotificationToast } from '@/features/mail/services/mail-toast.service';

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
    const dedupe = new Map<string, number>();
    const DEDUPE_TTL_MS = 5000;
    const markSeen = (key: string) => {
      const now = Date.now();
      dedupe.set(key, now);
      dedupe.forEach((ts, k) => {
        if (now - ts > DEDUPE_TTL_MS) dedupe.delete(k);
      });
    };
    const isSeen = (key: string) => dedupe.has(key);
    const refreshUnreadCount = () => {
      void getUnreadCount().then((payload) => {
        window.dispatchEvent(new CustomEvent(NOTIFICATION_WINDOW_EVENTS.unreadCountUpdated, { detail: payload }));
      });
    };

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    const onCreated = (payload: {
      recipientId?: string;
      message?: { id?: string; subject?: string; preview?: string };
      notification?: {
        title?: string;
        message?: string;
        priority?: NotificationPriority;
        actionUrl?: string;
        actionLabel?: string;
        showAsToast?: boolean;
        metadata?: Record<string, unknown>;
      };
    }) => {
      const metadataMessageId =
        typeof payload?.notification?.metadata?.messageId === 'string'
          ? payload.notification.metadata.messageId
          : undefined;
      const dedupeKey = payload?.recipientId || payload?.message?.id || metadataMessageId;
      if (dedupeKey && isSeen(`created:${dedupeKey}`)) return;
      if (dedupeKey) markSeen(`created:${dedupeKey}`);
      const shouldShowToast = payload?.notification?.showAsToast !== false
        && payload?.notification?.metadata?.showAsToast !== false;
      if (shouldShowToast) {
        if (payload?.notification?.title || payload?.notification?.message) {
          showNotificationToast(payload?.notification);
        } else if (payload?.message?.subject || payload?.message?.preview) {
          showNotificationToast({
            title: 'Nuevo correo',
            message: payload?.message?.subject || payload?.message?.preview || 'Tienes un nuevo mensaje.',
            priority: 'NORMAL',
          });
        }
      }
      window.dispatchEvent(new Event(NOTIFICATION_WINDOW_EVENTS.refresh));
      refreshUnreadCount();
    };

    const onUnreadCountUpdated = (payload: NotificationUnreadCount) => {
      window.dispatchEvent(new CustomEvent(NOTIFICATION_WINDOW_EVENTS.unreadCountUpdated, { detail: payload }));
    };

    const onMessageCreated = (payload: { recipientId?: string; message?: { id?: string; subject?: string; preview?: string } }) => {
      const dedupeKey = payload?.recipientId || payload?.message?.id || '';
      if (dedupeKey && isSeen(`message:${dedupeKey}`)) return;
      if (dedupeKey) markSeen(`message:${dedupeKey}`);
      showNotificationToast({
        title: "Nuevo correo",
        message: payload?.message?.subject || payload?.message?.preview || "Tienes un nuevo mensaje.",
        priority: "NORMAL",
      });
      // Unificar refresh para evitar dobles caminos de sincronizacion durante coexistencia legacy/v2.
      window.dispatchEvent(new Event(NOTIFICATION_WINDOW_EVENTS.refresh));
      refreshUnreadCount();
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on(NOTIFICATION_SOCKET_EVENTS.created, onCreated);
    socket.on(NOTIFICATION_SOCKET_EVENTS.messageCreated, onMessageCreated);
    socket.on(NOTIFICATION_SOCKET_EVENTS.unreadCountUpdated, onUnreadCountUpdated);

    refreshUnreadCount();

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off(NOTIFICATION_SOCKET_EVENTS.created, onCreated);
      socket.off(NOTIFICATION_SOCKET_EVENTS.messageCreated, onMessageCreated);
      socket.off(NOTIFICATION_SOCKET_EVENTS.unreadCountUpdated, onUnreadCountUpdated);
      closeNotificationSocket();
      setConnected(false);
    };
  }, [isAuthenticated, userId]);

  const value = useMemo(() => ({ connected }), [connected]);

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}


