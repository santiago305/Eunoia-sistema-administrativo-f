import axiosInstance from "@/shared/common/utils/axios";
import { API_ADVISERS_GROUP } from "./APIs";

export type AdviserOption = {
  id: string;
  name: string;
  email: string;
  isActive?: boolean;
  assignedOrders?: number;
  soldTotal?: number;
  collectedTotal?: number;
};

export type AdviserSummaryResponse = { items: AdviserOption[]; total: number; page: number; limit: number; totalPages: number };

export const listAdvisers = async (): Promise<AdviserOption[]> => {
  const response = await axiosInstance.get<AdviserOption[]>(
    API_ADVISERS_GROUP.list,
  );
  return response.data;
};

export const createAdviser = async (
  userId: string,
): Promise<AdviserOption> => {
  const response = await axiosInstance.post<AdviserOption>(
    API_ADVISERS_GROUP.create,
    { userId },
  );
  return response.data;
};

export const listAdviserSummary = async (params: { page: number; limit?: number; q?: string }) =>
  (await axiosInstance.get<AdviserSummaryResponse>(API_ADVISERS_GROUP.summary, { params })).data;

export const setAdviserActive = async (id: string, isActive: boolean) =>
  (await axiosInstance.patch(API_ADVISERS_GROUP.active(id), { isActive })).data;

export const updateAdviser = async (id: string, payload: { name: string; email: string }) =>
  (await axiosInstance.patch(`/advisers/${id}`, payload)).data;
