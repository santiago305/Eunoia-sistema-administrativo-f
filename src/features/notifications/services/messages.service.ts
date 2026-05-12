import axiosInstance from "@/shared/common/utils/axios";
import { API_NOTIFICATION_MESSAGES_GROUP } from "@/shared/services/APIs";
import type {
  InboxItem,
  MailLabelItem,
  MessageListQuery,
  MessageListResponse,
  NotificationModuleItem,
  SentMessageItem,
} from "../types/message.types";

export const getNotificationModules = async () => {
  const response = await axiosInstance.get<NotificationModuleItem[]>(
    API_NOTIFICATION_MESSAGES_GROUP.modules,
  );
  return response.data;
};

export const listMessages = async (query: MessageListQuery) => {
  const response = await axiosInstance.get<MessageListResponse<InboxItem | SentMessageItem>>(
    API_NOTIFICATION_MESSAGES_GROUP.listMessages,
    { params: query },
  );
  return response.data;
};

export const getMessageDetail = async (id: string) => {
  const response = await axiosInstance.get(API_NOTIFICATION_MESSAGES_GROUP.getMessageDetail(id));
  return response.data;
};

export const sendMessage = async (payload: {
  recipients: string;
  subject: string;
  bodyHtml: string;
  originModule?: string;
  labelIds?: string[];
}) => {
  const response = await axiosInstance.post(API_NOTIFICATION_MESSAGES_GROUP.sendMessage, payload);
  return response.data;
};

export const listMailLabels = async () => {
  const response = await axiosInstance.get<MailLabelItem[]>(API_NOTIFICATION_MESSAGES_GROUP.listLabels);
  return response.data;
};

export const createMailLabel = async (payload: { name: string; color: string }) => {
  const response = await axiosInstance.post<MailLabelItem>(API_NOTIFICATION_MESSAGES_GROUP.createLabel, payload);
  return response.data;
};

export const deleteMailLabel = async (id: string) => {
  const response = await axiosInstance.delete(API_NOTIFICATION_MESSAGES_GROUP.deleteLabel(id));
  return response.data;
};

export const markMessageAsRead = async (recipientId: string) => {
  const response = await axiosInstance.patch(API_NOTIFICATION_MESSAGES_GROUP.markMessageRead(recipientId));
  return response.data;
};

export const starMessage = async (recipientId: string) => {
  const response = await axiosInstance.patch(API_NOTIFICATION_MESSAGES_GROUP.starMessage(recipientId));
  return response.data;
};

export const unstarMessage = async (recipientId: string) => {
  const response = await axiosInstance.patch(API_NOTIFICATION_MESSAGES_GROUP.unstarMessage(recipientId));
  return response.data;
};

export const deleteMessage = async (recipientId: string) => {
  const response = await axiosInstance.delete(API_NOTIFICATION_MESSAGES_GROUP.deleteMessage(recipientId));
  return response.data;
};

export const restoreMessage = async (recipientId: string) => {
  const response = await axiosInstance.patch(API_NOTIFICATION_MESSAGES_GROUP.restoreMessage(recipientId));
  return response.data;
};

export const bulkMessages = async (payload: {
  messageRecipientIds: string[];
  action: "MARK_AS_READ" | "MARK_AS_UNREAD" | "DELETE" | "STAR" | "UNSTAR" | "RESTORE";
}) => {
  const response = await axiosInstance.post(API_NOTIFICATION_MESSAGES_GROUP.bulkMessages, payload);
  return response.data;
};

export const replyMessage = async (
  id: string,
  payload: { bodyHtml: string; recipients?: string },
) => {
  const response = await axiosInstance.post(API_NOTIFICATION_MESSAGES_GROUP.replyMessage(id), payload);
  return response.data;
};

export const forwardMessage = async (
  id: string,
  payload: { bodyHtml: string; recipients: string },
) => {
  const response = await axiosInstance.post(API_NOTIFICATION_MESSAGES_GROUP.forwardMessage(id), payload);
  return response.data;
};
