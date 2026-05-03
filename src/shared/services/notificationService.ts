import axiosInstance from '@/shared/common/utils/axios';
import { API_NOTIFICATIONS_GROUP } from './APIs';
import type { NotificationRecipientItem, NotificationUnreadCount } from '@/features/notifications/types/notification.types';

export const listMyNotifications = async (params?: { limit?: number; cursor?: string }) => {
  const response = await axiosInstance.get<NotificationRecipientItem[]>(API_NOTIFICATIONS_GROUP.list, { params });
  return response.data;
};

export const getUnreadCount = async () => {
  const response = await axiosInstance.get<NotificationUnreadCount>(API_NOTIFICATIONS_GROUP.unreadCount);
  return response.data;
};

export const getNotificationDetail = async (recipientId: string) => {
  const response = await axiosInstance.get<NotificationRecipientItem>(API_NOTIFICATIONS_GROUP.byId(recipientId));
  return response.data;
};

export const markNotificationAsSeen = async (recipientId: string) => {
  const response = await axiosInstance.patch<NotificationRecipientItem>(API_NOTIFICATIONS_GROUP.markSeen(recipientId));
  return response.data;
};

export const markNotificationAsRead = async (recipientId: string) => {
  const response = await axiosInstance.patch<NotificationRecipientItem>(API_NOTIFICATIONS_GROUP.markRead(recipientId));
  return response.data;
};

export const markAllNotificationsAsRead = async () => {
  const response = await axiosInstance.patch<{ updated: number }>(API_NOTIFICATIONS_GROUP.markAllRead);
  return response.data;
};

export const archiveNotification = async (recipientId: string) => {
  const response = await axiosInstance.patch<NotificationRecipientItem>(API_NOTIFICATIONS_GROUP.archive(recipientId));
  return response.data;
};

export const sendDevNotificationToMe = async () => {
  const response = await axiosInstance.post<NotificationRecipientItem>(API_NOTIFICATIONS_GROUP.devSendToMe);
  return response.data;
};
