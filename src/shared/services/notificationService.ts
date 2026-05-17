import axiosInstance from '@/shared/common/utils/axios';
import { API_NOTIFICATION_MESSAGES_GROUP } from './APIs';
import type { NotificationRecipientItem, NotificationUnreadCount } from '@/features/mail/types/notification.types';
import type { InboxItem, SentMessageItem } from '@/features/mail/types/message.types';

type MessageStateLike = {
  id: string;
  readAt?: string | null;
  openedAt?: string | null;
  deliveredAt?: string | null;
  isArchived?: boolean;
  deletedAt?: string | null;
  updatedAt?: string;
  createdAt?: string;
};

type NotificationDetailResponse = {
  recipient?: MessageStateLike | null;
  message?: SentMessageItem | null;
};

const computeStatus = (recipient: MessageStateLike): NotificationRecipientItem['status'] => {
  if (recipient.deletedAt) return 'DELETED';
  if (recipient.isArchived) return 'ARCHIVED';
  if (recipient.readAt) return 'READ';
  if (recipient.openedAt) return 'SEEN';
  return 'UNREAD';
};

const toNotificationItem = (
  recipient: MessageStateLike,
  message: SentMessageItem,
): NotificationRecipientItem => ({
  recipientId: recipient.id,
  status: computeStatus(recipient),
  seenAt: recipient.openedAt ?? null,
  readAt: recipient.readAt ?? null,
  deliveredAt: recipient.deliveredAt ?? null,
  archivedAt: recipient.isArchived ? recipient.updatedAt ?? null : null,
  dismissedAt: null,
  createdAt: recipient.createdAt ?? message.createdAt,
  notification: {
    id: message.id,
    type: message.kind ?? 'SYSTEM_MESSAGE',
    category: message.originModule === 'purchases' ? 'PURCHASES' : 'SYSTEM',
    title: message.subject,
    message: message.bodyText,
    priority: 'NORMAL',
    actionUrl: null,
    actionLabel: null,
    sourceModule: message.originModule ?? null,
    sourceEntityType: message.sourceEntityType ?? null,
    sourceEntityId: message.sourceEntityId ?? null,
    metadata: (message.bodyJson ?? {}) as Record<string, unknown>,
    showAsToast: true,
    createdAt: message.createdAt,
  },
});

export const listMyNotifications = async (params?: { limit?: number; cursor?: string }) => {
  const page = Number(params?.cursor ?? 1);
  const response = await axiosInstance.get<{ items: InboxItem[] }>(API_NOTIFICATION_MESSAGES_GROUP.listMessages, {
    params: { view: 'inbox', limit: params?.limit ?? 40, page: Number.isFinite(page) && page > 0 ? page : 1 },
  });
  return (response.data.items ?? []).reduce<NotificationRecipientItem[]>((acc, item) => {
    if (!('recipient' in item) || !item.message) return acc;
    acc.push(toNotificationItem(item.recipient, item.message));
    return acc;
  }, []);
};

export const getUnreadCount = async () => {
  const response = await axiosInstance.get<{ total: number }>(API_NOTIFICATION_MESSAGES_GROUP.listMessages, {
    params: { view: 'inbox', read: false, page: 1, limit: 1 },
  });
  const unread = Number(response.data.total ?? 0);
  return { unread, unseen: unread } satisfies NotificationUnreadCount;
};

export const getNotificationDetail = async (recipientId: string) => {
  const response = await axiosInstance.get<NotificationDetailResponse>(
    API_NOTIFICATION_MESSAGES_GROUP.getMessageDetail(recipientId),
  );
  const recipient = response.data?.recipient;
  const message = response.data?.message;
  if (!recipient || !message) {
    throw new Error('NOTIFICATION_DETAIL_INVALID');
  }
  return toNotificationItem(recipient, message);
};

export const markNotificationAsSeen = async (recipientId: string) => {
  await axiosInstance.patch(API_NOTIFICATION_MESSAGES_GROUP.markMessageRead(recipientId));
  return getNotificationDetail(recipientId);
};

export const markNotificationAsRead = async (recipientId: string) => {
  await axiosInstance.patch(API_NOTIFICATION_MESSAGES_GROUP.markMessageRead(recipientId));
  return getNotificationDetail(recipientId);
};

export const markAllNotificationsAsRead = async () => {
  const pageSize = 200;
  let page = 1;
  const stateIds: string[] = [];
  while (true) {
    const idsResponse = await axiosInstance.get<{ items: InboxItem[] }>(API_NOTIFICATION_MESSAGES_GROUP.listMessages, {
      params: { view: 'inbox', read: false, page, limit: pageSize },
    });
    const chunk = (idsResponse.data.items ?? [])
      .filter((item): item is InboxItem => 'recipient' in item)
      .map((item) => item.recipient.id);
    stateIds.push(...chunk);
    if (chunk.length < pageSize) break;
    page += 1;
  }
  if (!stateIds.length) return { updated: 0 };
  const response = await axiosInstance.post<{ updated: number }>(API_NOTIFICATION_MESSAGES_GROUP.bulkMessages, {
    messageStateIds: stateIds,
    action: 'MARK_AS_READ',
  });
  return response.data;
};

export const archiveNotification = async (recipientId: string) => {
  await axiosInstance.patch(API_NOTIFICATION_MESSAGES_GROUP.archiveMessage(recipientId));
  return getNotificationDetail(recipientId);
};

