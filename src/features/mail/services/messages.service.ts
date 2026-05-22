import axiosInstance from "@/shared/common/utils/axios";
import { API_NOTIFICATION_MESSAGES_GROUP } from "@/shared/services/APIs";
import type {
  InboxItem,
  MailMessageActionItem,
  MailLabelItem,
  MessageListQuery,
  MessageListResponse,
  SentMessageItem,
} from "../types/message.types";

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

export const getMyMailStorageSummary = async () => {
  const response = await axiosInstance.get<{
    userId: string;
    quotaBytes: number;
    quotaGb: number;
    usedBytes: number;
    remainingBytes: number;
    usedPercent: number;
  }>(API_NOTIFICATION_MESSAGES_GROUP.getMyStorageSummary);
  return response.data;
};

export const listMessageActions = async (query: { threadId?: string; messageId?: string }) => {
  const response = await axiosInstance.get<MailMessageActionItem[]>(
    API_NOTIFICATION_MESSAGES_GROUP.listActions,
    { params: query },
  );
  return response.data;
};

export const executeMessageAction = async (id: string, payload?: { comment?: string }) => {
  const response = await axiosInstance.post<{
    code: "ACTION_COMPLETED" | "ACTION_ALREADY_COMPLETED";
    action: MailMessageActionItem;
  }>(API_NOTIFICATION_MESSAGES_GROUP.executeAction(id), payload ?? {});
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

export const scheduleMessage = async (payload: {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  bodyHtml: string;
  scheduledAt: string;
  bodyJson?: Record<string, unknown> | null;
  originModule?: string;
  labelIds?: string[];
  attachmentIds?: string[];
}) => {
  const response = await axiosInstance.post(API_NOTIFICATION_MESSAGES_GROUP.scheduleMessage, payload);
  return response.data;
};

export const rescheduleMessage = async (id: string, scheduledAt: string) => {
  const response = await axiosInstance.patch(API_NOTIFICATION_MESSAGES_GROUP.rescheduleMessage(id), { scheduledAt });
  return response.data;
};

export const cancelScheduledMessage = async (id: string) => {
  const response = await axiosInstance.delete(API_NOTIFICATION_MESSAGES_GROUP.cancelScheduledMessage(id));
  return response.data;
};

export const sendScheduledMessageNow = async (id: string) => {
  const response = await axiosInstance.post(API_NOTIFICATION_MESSAGES_GROUP.sendScheduledMessageNow(id));
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

export const countMessages = async (query: Omit<MessageListQuery, "q" | "page" | "limit">) => {
  const response = await axiosInstance.get<{ total: number }>(
    API_NOTIFICATION_MESSAGES_GROUP.countMessages,
    { params: query },
  );
  return response.data;
};

export const countSidebarMessages = async (labelIds: string[] = []) => {
  const normalizedLabelIds = Array.from(new Set(labelIds.filter(Boolean)));
  const response = await axiosInstance.get<{
    inbox: number;
    starred: number;
    sent: number;
    scheduled: number;
    drafts: number;
    trash: number;
    archived: number;
    snoozed: number;
    labelUnreadById: Record<string, number>;
  }>(API_NOTIFICATION_MESSAGES_GROUP.countSidebarMessages, {
    params: normalizedLabelIds.length
      ? { labelIds: normalizedLabelIds.join(",") }
      : undefined,
  });
  return response.data;
};

export const updateMailLabel = async (id: string, payload: { name?: string; color?: string }) => {
  const response = await axiosInstance.patch<MailLabelItem>(API_NOTIFICATION_MESSAGES_GROUP.updateLabel(id), payload);
  return response.data;
};

export const deleteMailLabel = async (id: string) => {
  const response = await axiosInstance.delete(API_NOTIFICATION_MESSAGES_GROUP.deleteLabel(id));
  return response.data;
};

export const assignLabelToMessage = async (messageId: string, labelId: string) => {
  const response = await axiosInstance.post(
    API_NOTIFICATION_MESSAGES_GROUP.assignLabelToMessage(messageId, labelId),
  );
  return response.data;
};

export const removeLabelFromMessage = async (messageId: string, labelId: string) => {
  const response = await axiosInstance.delete(
    API_NOTIFICATION_MESSAGES_GROUP.removeLabelFromMessage(messageId, labelId),
  );
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
  messageRecipientIds?: string[];
  messageStateIds?: string[];
  action:
    | "MARK_AS_READ"
    | "MARK_AS_UNREAD"
    | "DELETE"
    | "STAR"
    | "UNSTAR"
    | "RESTORE"
    | "ARCHIVE"
    | "UNARCHIVE"
    | "SNOOZE"
    | "UNSNOOZE"
    | "MOVE_TO_TRASH"
    | "ASSIGN_LABEL"
    | "REMOVE_LABEL";
  snoozedUntil?: string;
  labelId?: string;
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
  kind?: "file" | "image";
}) => {
  const form = new FormData();
  form.append("file", input.file);
  if (input.messageId) form.append("messageId", input.messageId);
  if (input.draftId) form.append("draftId", input.draftId);
  form.append("kind", input.kind ?? "file");
  const response = await axiosInstance.post(API_NOTIFICATION_MESSAGES_GROUP.uploadAttachment, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data as {
    id: string;
    name: string;
    mimeType: string;
    sizeBytes: number;
    attachmentKind: "file" | "image";
    messageId: string | null;
    draftId: string | null;
    createdAt: string;
  };
};

export const deleteAttachment = async (id: string) => {
  const response = await axiosInstance.delete(API_NOTIFICATION_MESSAGES_GROUP.deleteAttachment(id));
  return response.data;
};

export const downloadAttachmentBlobUrl = async (id: string) => {
  const response = await axiosInstance.get<Blob>(
    API_NOTIFICATION_MESSAGES_GROUP.downloadAttachment(id),
    { responseType: "blob" },
  );
  return URL.createObjectURL(response.data);
};

export const listModuleLabelConfigs = async () => {
  const response = await axiosInstance.get<
    Array<{ id: string; moduleKey: string; labelId: string | null; updatedByUserId: string | null; updatedAt: string }>
  >(API_NOTIFICATION_MESSAGES_GROUP.listModuleLabelConfigs);
  return response.data;
};

export const upsertModuleLabelConfig = async (moduleKey: string, labelId?: string | null) => {
  const response = await axiosInstance.patch(
    API_NOTIFICATION_MESSAGES_GROUP.upsertModuleLabelConfig(moduleKey),
    { labelId: labelId ?? null },
  );
  return response.data;
};
