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
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  bodyHtml: string;
  bodyJson?: Record<string, unknown> | null;
  originModule?: string;
  labelIds?: string[];
  attachmentIds?: string[];
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

export const markMessageAsUnread = async (recipientId: string) => {
  const response = await axiosInstance.patch(API_NOTIFICATION_MESSAGES_GROUP.markMessageUnread(recipientId));
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

export const permanentlyDeleteMessage = async (recipientId: string) => {
  const response = await axiosInstance.delete(API_NOTIFICATION_MESSAGES_GROUP.permanentlyDeleteMessage(recipientId));
  return response.data;
};

export const restoreMessage = async (recipientId: string) => {
  const response = await axiosInstance.patch(API_NOTIFICATION_MESSAGES_GROUP.restoreMessage(recipientId));
  return response.data;
};

export const archiveMessage = async (recipientId: string) => {
  const response = await axiosInstance.patch(API_NOTIFICATION_MESSAGES_GROUP.archiveMessage(recipientId));
  return response.data;
};

export const unarchiveMessage = async (recipientId: string) => {
  const response = await axiosInstance.patch(API_NOTIFICATION_MESSAGES_GROUP.unarchiveMessage(recipientId));
  return response.data;
};

export const snoozeMessage = async (recipientId: string, snoozedUntil: string) => {
  const response = await axiosInstance.patch(API_NOTIFICATION_MESSAGES_GROUP.snoozeMessage(recipientId), { snoozedUntil });
  return response.data;
};

export const unsnoozeMessage = async (recipientId: string) => {
  const response = await axiosInstance.patch(API_NOTIFICATION_MESSAGES_GROUP.unsnoozeMessage(recipientId));
  return response.data;
};

export const bulkMessages = async (payload: {
  messageRecipientIds: string[];
  action: "MARK_AS_READ" | "MARK_AS_UNREAD" | "DELETE" | "STAR" | "UNSTAR" | "RESTORE" | "ARCHIVE" | "UNARCHIVE";
}) => {
  const response = await axiosInstance.post(API_NOTIFICATION_MESSAGES_GROUP.bulkMessages, payload);
  return response.data;
};

export const replyMessage = async (
  id: string,
  payload: { bodyHtml: string; bodyJson?: Record<string, unknown> | null; to?: string[]; cc?: string[]; bcc?: string[]; attachmentIds?: string[] },
) => {
  const response = await axiosInstance.post(API_NOTIFICATION_MESSAGES_GROUP.replyMessage(id), payload);
  return response.data;
};

export const forwardMessage = async (
  id: string,
  payload: { bodyHtml: string; bodyJson?: Record<string, unknown> | null; to: string[]; cc?: string[]; bcc?: string[]; attachmentIds?: string[] },
) => {
  const response = await axiosInstance.post(API_NOTIFICATION_MESSAGES_GROUP.forwardMessage(id), payload);
  return response.data;
};

export const listSearchHistory = async () => {
  const response = await axiosInstance.get<Array<{ id: string; query: string }>>(
    API_NOTIFICATION_MESSAGES_GROUP.listSearchHistory,
  );
  return response.data;
};

export const saveSearchHistory = async (query: string) => {
  const response = await axiosInstance.post<Array<{ id: string; query: string }>>(
    API_NOTIFICATION_MESSAGES_GROUP.saveSearchHistory,
    { query },
  );
  return response.data;
};

export const deleteSearchHistory = async (id: string) => {
  const response = await axiosInstance.delete(API_NOTIFICATION_MESSAGES_GROUP.deleteSearchHistory(id));
  return response.data;
};

export const uploadAttachment = async (input: {
  file: File;
  messageId?: string;
  draftId?: string;
}) => {
  const form = new FormData();
  form.append("file", input.file);
  if (input.messageId) form.append("messageId", input.messageId);
  if (input.draftId) form.append("draftId", input.draftId);
  const response = await axiosInstance.post(API_NOTIFICATION_MESSAGES_GROUP.uploadAttachment, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data as {
    id: string;
    name: string;
    mimeType: string;
    sizeBytes: number;
    messageId: string | null;
    draftId: string | null;
    createdAt: string;
  };
};

export const deleteAttachment = async (id: string) => {
  const response = await axiosInstance.delete(API_NOTIFICATION_MESSAGES_GROUP.deleteAttachment(id));
  return response.data;
};
