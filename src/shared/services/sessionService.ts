import axiosInstance from "@/shared/common/utils/axios";
import { API_SESSIONS_GROUP } from "./APIs";
import type { SessionApiDto, SessionMessageResponse } from "@/features/sessions/types/session.api";

export const findSessions = async () => {
  const response = await axiosInstance.get<SessionApiDto[]>(API_SESSIONS_GROUP.findAll);
  return response.data;
};

export const revokeAllSessions = async () => {
  const response = await axiosInstance.delete<SessionMessageResponse>(API_SESSIONS_GROUP.revokeAll);
  return response.data;
};

export const revokeSession = async (id: string) => {
  const response = await axiosInstance.delete<SessionMessageResponse>(API_SESSIONS_GROUP.revokeSession(id));
  return response.data;
};



