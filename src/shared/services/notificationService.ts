import axiosInstance from '@/shared/common/utils/axios';
import { API_NOTIFICATION_MESSAGES_GROUP } from './APIs';
import type { NotificationRecipientItem, NotificationUnreadCount } from '@/features/mail/types/notification.types';
import type { InboxItem } from '@/features/mail/types/message.types';

export const listMyNotifications = async (params?: { limit?: number; cursor?: string }) => {
  const response = await axiosInstance.get<{ items: InboxItem[] }>(API_NOTIFICATION_MESSAGES_GROUP.listMessages, {
    params: { view: 'inbox', limit: params?.limit ?? 40, page: 1 },
  });
  return (response.data.items ?? [])
    .filter((item): item is InboxItem => 'recipient' in item)
    .map((item) => ({
      recipientId: item.recipient.id,
      status: item.recipient.readAt ? 'READ' : item.recipient.openedAt ? 'SEEN' : 'UNREAD',
      seenAt: item.recipient.openedAt,
      readAt: item.recipient.readAt,
      deliveredAt: item.recipient.deliveredAt,
      archivedAt: item.recipient.isArchived ? item.recipient.updatedAt : null,
      dismissedAt: null,
      createdAt: item.recipient.createdAt,
      notification: {
        id: item.message.id,
        type: item.message.kind ?? 'SYSTEM_MESSAGE',
        category: item.message.originModule === 'purchases' ? 'PURCHASES' : 'SYSTEM',
        title: item.message.subject,
        message: item.message.bodyText,
        priority: 'NORMAL',
        actionUrl: null,
        actionLabel: null,
        sourceModule: item.message.originModule ?? null,
        sourceEntityType: item.message.sourceEntityType ?? null,
        sourceEntityId: item.message.sourceEntityId ?? null,
        metadata: (item.message.bodyJson ?? {}) as Record<string, unknown>,
        showAsToast: true,
        createdAt: item.message.createdAt,
      },
    }));
};

export const getUnreadCount = async () => {
  const response = await axiosInstance.get<{ total: number }>(API_NOTIFICATION_MESSAGES_GROUP.listMessages, {
    params: { view: 'inbox', read: false, page: 1, limit: 1 },
  });
  const unread = Number(response.data.total ?? 0);
  return { unread, unseen: unread } satisfies NotificationUnreadCount;
};

export const getNotificationDetail = async (recipientId: string) => {
  const response = await axiosInstance.get(API_NOTIFICATION_MESSAGES_GROUP.getMessageDetail(recipientId));
  return response.data as NotificationRecipientItem;
};

export const markNotificationAsSeen = async (recipientId: string) => {
  const response = await axiosInstance.patch<NotificationRecipientItem>(API_NOTIFICATION_MESSAGES_GROUP.markMessageRead(recipientId));
  return response.data;
};

export const markNotificationAsRead = async (recipientId: string) => {
  const response = await axiosInstance.patch<NotificationRecipientItem>(API_NOTIFICATION_MESSAGES_GROUP.markMessageRead(recipientId));
  return response.data;
};

export const markAllNotificationsAsRead = async () => {
  const idsResponse = await axiosInstance.get<{ items: InboxItem[] }>(API_NOTIFICATION_MESSAGES_GROUP.listMessages, {
    params: { view: 'inbox', read: false, page: 1, limit: 200 },
  });
  const stateIds = (idsResponse.data.items ?? [])
    .filter((item): item is InboxItem => 'recipient' in item)
    .map((item) => item.recipient.id);
  const response = await axiosInstance.post<{ updated: number }>(API_NOTIFICATION_MESSAGES_GROUP.bulkMessages, {
    messageStateIds: stateIds,
    action: 'MARK_AS_READ',
  });
  return response.data;
};

export const archiveNotification = async (recipientId: string) => {
  const response = await axiosInstance.patch<NotificationRecipientItem>(API_NOTIFICATION_MESSAGES_GROUP.archiveMessage(recipientId));
  return response.data;
};

