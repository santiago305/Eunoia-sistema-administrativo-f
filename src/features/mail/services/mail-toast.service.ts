import { sileo } from 'sileo';
import type { NotificationPayload, NotificationPriority } from '../types/notification.types';

const getToastMethodByPriority = (priority: NotificationPriority) => {
  switch (priority) {
    case 'CRITICAL':
    case 'URGENT':
      return sileo.error;
    case 'HIGH':
      return sileo.warning;
    case 'NORMAL':
      return sileo.info;
    case 'LOW':
    default:
      return null;
  }
};

export const showNotificationToast = (notification?: Partial<NotificationPayload>) => {
  if (!notification) return;

  const priority = (notification.priority ?? 'NORMAL') as NotificationPriority;
  const title = notification.title ?? 'Nueva notificacion';
  const description = notification.message ?? 'Tienes una nueva notificacion.';

  const actionUrl = notification.actionUrl ?? null;
  const actionLabel = notification.actionLabel ?? null;

  if (actionUrl && actionLabel) {
    sileo.action({
      title,
      description,
      button: {
        title: actionLabel,
        onClick: () => {
          window.location.href = actionUrl;
        },
      },
    });
    return;
  }

  const method = getToastMethodByPriority(priority);
  if (!method) return;

  method({
    title,
    description,
  });
};
