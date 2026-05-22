import { createContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useAuth } from '@/shared/hooks/useAuth';
import { closeNotificationSocket, createNotificationSocket } from '@/shared/lib/socket';
import { NOTIFICATION_SOCKET_EVENTS, NOTIFICATION_WINDOW_EVENTS } from '@/features/mail/constants/mail-events.constants';
import type { NotificationPriority } from '@/features/mail/types/notification.types';
import type { MailActionUpdatedPayload, MessageCreatedRealtimePayload } from '@/features/mail/types/realtime.types';
import { getHasUnreadMail } from '@/shared/services/notificationService';
import { showNotificationToast } from '@/features/mail/services/mail-toast.service';

type NotificationContextValue = {
  connected: boolean;
  hasUnreadMail: boolean;
};

export const NotificationContext = createContext<NotificationContextValue>({
  connected: false,
  hasUnreadMail: false,
});

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, userId } = useAuth();
  const [connected, setConnected] = useState(false);
  const [hasUnreadMail, setHasUnreadMail] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !userId) {
      closeNotificationSocket();
      setConnected(false);
      setHasUnreadMail(false);
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
    const loadHasUnreadMail = () => {
      void getHasUnreadMail()
        .then((hasUnread) => {
          setHasUnreadMail(hasUnread);
        })
        .catch(() => {
          // Conserva el estado previo si falla la consulta inicial.
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
      setHasUnreadMail(true);
      window.dispatchEvent(new Event(NOTIFICATION_WINDOW_EVENTS.systemNotificationCreated));
      window.dispatchEvent(new Event(NOTIFICATION_WINDOW_EVENTS.messagesRefresh));
    };

    const onMessageCreated = (payload: MessageCreatedRealtimePayload) => {
      const dedupeKey = payload?.recipientId || payload?.recipient?.id || payload?.message?.id || '';
      if (dedupeKey && isSeen(`message:${dedupeKey}`)) return;
      if (dedupeKey) markSeen(`message:${dedupeKey}`);
      if (payload?.hasUnreadMail !== false) {
        showNotificationToast({
          title: "Nuevo correo",
          message: payload?.message?.subject || payload?.message?.preview || "Tienes un nuevo mensaje.",
          priority: "NORMAL",
        });
        setHasUnreadMail(true);
      }
      window.dispatchEvent(
        new CustomEvent<MessageCreatedRealtimePayload>(NOTIFICATION_WINDOW_EVENTS.mailMessageCreated, {
          detail: payload,
        }),
      );
    };
    const onActionUpdated = (payload: MailActionUpdatedPayload) => {
      if (!payload?.actionId) return;
      window.dispatchEvent(
        new CustomEvent<MailActionUpdatedPayload>(NOTIFICATION_WINDOW_EVENTS.mailActionUpdated, {
          detail: payload,
        }),
      );
    };
    const onLocalUnreadStateChanged = (event: Event) => {
      const customEvent = event as CustomEvent<boolean>;
      if (typeof customEvent.detail === "boolean") {
        setHasUnreadMail(customEvent.detail);
      }
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on(NOTIFICATION_SOCKET_EVENTS.created, onCreated);
    socket.on(NOTIFICATION_SOCKET_EVENTS.messageCreated, onMessageCreated);
    socket.on(NOTIFICATION_SOCKET_EVENTS.actionUpdated, onActionUpdated);
    window.addEventListener(NOTIFICATION_WINDOW_EVENTS.mailUnreadSync, loadHasUnreadMail);
    window.addEventListener(
      NOTIFICATION_WINDOW_EVENTS.mailUnreadStateChanged,
      onLocalUnreadStateChanged as EventListener,
    );

    loadHasUnreadMail();

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off(NOTIFICATION_SOCKET_EVENTS.created, onCreated);
      socket.off(NOTIFICATION_SOCKET_EVENTS.messageCreated, onMessageCreated);
      socket.off(NOTIFICATION_SOCKET_EVENTS.actionUpdated, onActionUpdated);
      window.removeEventListener(NOTIFICATION_WINDOW_EVENTS.mailUnreadSync, loadHasUnreadMail);
      window.removeEventListener(
        NOTIFICATION_WINDOW_EVENTS.mailUnreadStateChanged,
        onLocalUnreadStateChanged as EventListener,
      );
      closeNotificationSocket();
      setConnected(false);
    };
  }, [isAuthenticated, userId]);

  const value = useMemo(
    () => ({ connected, hasUnreadMail }),
    [connected, hasUnreadMail],
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}


