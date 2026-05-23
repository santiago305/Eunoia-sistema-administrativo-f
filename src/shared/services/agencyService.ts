import axiosInstance from "@/shared/common/utils/axios";
import type { Paginated } from "@/features/clients/types/clientApi";
import type {
  AgencyDetail,
  AgencyListItem,
  CreateAgencyBody,
  UpdateAgencyBody,
} from "@/features/agencies/types/agencyApi";
import type {
  AgencySearchSnapshot,
  AgencySearchStateResponse,
} from "@/features/agencies/types/agencySearch";
import { agencyRoutes } from "./APIs";

export const listAgencies = async (params: {
  q?: string;
  page?: number;
  limit?: number;
  isActive?: "true" | "false";
  filters?: unknown[] | string;
}): Promise<Paginated<AgencyListItem>> => {
  const requestParams = {
    ...params,
    filters:
      Array.isArray(params.filters) && params.filters.length
        ? JSON.stringify(params.filters)
        : typeof params.filters === "string"
          ? params.filters
          : undefined,
  };

  const response = await axiosInstance.get<Paginated<AgencyListItem>>(
    agencyRoutes.list,
    {
      params: requestParams,
    },
  );

  return response.data;
};

export const getAgencyById = async (id: string): Promise<AgencyDetail> => {
  const response = await axiosInstance.get<AgencyDetail>(agencyRoutes.detail(id));
  return response.data;
};

export const createAgency = async (
  payload: CreateAgencyBody,
): Promise<{ message: string; id?: string }> => {
  const response = await axiosInstance.post<{ message: string; id?: string }>(
    agencyRoutes.create,
    payload,
  );

  return response.data;
};

export const updateAgency = async (
  id: string,
  payload: UpdateAgencyBody,
): Promise<{ message: string; id?: string }> => {
  const response = await axiosInstance.patch<{ message: string; id?: string }>(
    agencyRoutes.update(id),
    payload,
  );

  return response.data;
};

export const updateAgencyActive = async (
  id: string,
  payload: { isActive: boolean },
): Promise<{ message: string }> => {
  const response = await axiosInstance.patch<{ message: string }>(
    agencyRoutes.active(id),
    payload,
  );

  return response.data;
};

export const getAgencySearchState = async (): Promise<AgencySearchStateResponse> => {
  const response = await axiosInstance.get<AgencySearchStateResponse>(
    agencyRoutes.searchState,
  );

  return response.data;
};

export const saveAgencySearchMetric = async (
  name: string,
  snapshot: AgencySearchSnapshot,
): Promise<{ type: string; message: string }> => {
  const response = await axiosInstance.post<{ type: string; message: string }>(
    agencyRoutes.searchMetrics,
    {
      name,
      snapshot,
    },
  );

  return response.data;
};

export const deleteAgencySearchMetric = async (
  metricId: string,
): Promise<{ type: string; message: string }> => {
  const response = await axiosInstance.delete<{ type: string; message: string }>(
    agencyRoutes.searchMetricDetail(metricId),
  );

  return response.data;
};

