import axiosInstance from "@/shared/common/utils/axios";
import { API_NOTIFICATION_MESSAGES_GROUP } from "@/shared/services/APIs";
import type { DraftMessageItem } from "../types/message.types";

export const listDrafts = async () => {
  const response = await axiosInstance.get<DraftMessageItem[]>(API_NOTIFICATION_MESSAGES_GROUP.listDrafts);
  return response.data;
};

export const createDraft = async (payload: {
  recipients?: string;
  subject?: string;
  bodyHtml?: string;
  originModule?: string;
}) => {
  const response = await axiosInstance.post(API_NOTIFICATION_MESSAGES_GROUP.createDraft, payload);
  return response.data;
};

export const updateDraft = async (
  id: string,
  payload: { recipients?: string; subject?: string; bodyHtml?: string },
) => {
  const response = await axiosInstance.patch(API_NOTIFICATION_MESSAGES_GROUP.updateDraft(id), payload);
  return response.data;
};

export const deleteDraft = async (id: string) => {
  const response = await axiosInstance.delete(API_NOTIFICATION_MESSAGES_GROUP.deleteDraft(id));
  return response.data;
};

export const sendDraft = async (id: string, recipients: string) => {
  const response = await axiosInstance.post(API_NOTIFICATION_MESSAGES_GROUP.sendDraft(id), { recipients });
  return response.data;
};
