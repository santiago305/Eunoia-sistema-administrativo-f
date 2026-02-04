import axiosInstance from "@/common/utils/axios";
import { API_SESSIONS_GROUP } from "./APIs";
import type { SessionApiDto, SessionMessageResponse } from "@/types/session";
import { mapSessionApiToSessionDto } from "@/common/utils/sessionDetect";

export const findSessions = async () => {
  const response = await axiosInstance.get<SessionApiDto[]>(API_SESSIONS_GROUP.findAll);
  return response.data;
};

export const findSessionsMe = async () => {
  const sessions = await findSessions();
  return sessions.map(mapSessionApiToSessionDto);
};

export const revokeAllSessionsLessMe = async () => {
  const response = await axiosInstance.delete<SessionMessageResponse>(API_SESSIONS_GROUP.revokeAll);
  return response.data;
};

export const revokeAllSessions = revokeAllSessionsLessMe;

export const revokeSession = async (id: string) => {
  const response = await axiosInstance.delete<SessionMessageResponse>(API_SESSIONS_GROUP.revokeSession(id));
  return response.data;
};

