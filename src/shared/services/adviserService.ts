import axiosInstance from "@/shared/common/utils/axios";
import { API_ADVISERS_GROUP } from "./APIs";
import type { AdviserSearchSnapshot, AdviserSearchStateResponse } from "@/features/advisers/types/adviserSearch";

export type AdviserOption = {
  id: string;
  name: string;
  email: string;
  isActive?: boolean;
  assignedOrders?: number;
  soldTotal?: number;
  collectedTotal?: number;
};

export type AdviserPeriod = { startDate: string; endDate: string };
export type AdviserSummaryResponse = { items: AdviserOption[]; total: number; page: number; limit: number; totalPages: number; period: AdviserPeriod };
export type AdviserOrderListItem = {
  id: string;
  serie: string | null;
  correlative: number | null;
  createdAt: string;
  clientName: string;
  total: number;
  collectedTotal: number;
  stateName: string;
  stateColor: string | null;
};
export type AdviserOrdersResponse = { items: AdviserOrderListItem[]; total: number; page: number; limit: number; totalPages: number; period: AdviserPeriod };

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

export const listAdviserSummary = async (params: { page: number; limit?: number; q?: string; filters?: AdviserSearchSnapshot["filters"]; startDate?: string; endDate?: string }) =>
  (await axiosInstance.get<AdviserSummaryResponse>(API_ADVISERS_GROUP.summary, { params: { ...params, filters: params.filters?.length ? JSON.stringify(params.filters) : undefined } })).data;

export const listAdviserOrders = async (id: string, params: { page: number; limit?: number; startDate: string; endDate: string }) =>
  (await axiosInstance.get<AdviserOrdersResponse>(API_ADVISERS_GROUP.orders(id), { params })).data;

export const setAdviserActive = async (id: string, isActive: boolean) =>
  (await axiosInstance.patch(API_ADVISERS_GROUP.active(id), { isActive })).data;

export const updateAdviser = async (id: string, payload: { name: string; email: string }) =>
  (await axiosInstance.patch(`/advisers/${id}`, payload)).data;

export const getAdviserSearchState = async () => (await axiosInstance.get<AdviserSearchStateResponse>(API_ADVISERS_GROUP.searchState)).data;
export const saveAdviserSearchMetric = async (name: string, snapshot: AdviserSearchSnapshot) => (await axiosInstance.post(API_ADVISERS_GROUP.searchMetrics, { name, snapshot })).data;
export const deleteAdviserSearchMetric = async (id: string) => (await axiosInstance.delete(API_ADVISERS_GROUP.searchMetric(id))).data;
