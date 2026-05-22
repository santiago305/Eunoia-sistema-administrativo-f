import axiosInstance from "@/shared/common/utils/axios";
import type {
  CreatePackBody,
  Paginated,
  PackDetailResponse,
  PackListItem,
  UpdatePackBody,
} from "@/features/catalog/types/pack";
import type {
  PackSearchSnapshot,
  PackSearchStateResponse,
} from "@/features/catalog/types/packSearch";
import { packRoutes } from "./APIs";

export const listPacks = async (params: {
  q?: string;
  page?: number;
  limit?: number;
  isActive?: "true" | "false";
  filters?: unknown[] | string;
}): Promise<Paginated<PackListItem>> => {
  const requestParams = {
    ...params,
    filters:
      Array.isArray(params.filters) && params.filters.length
        ? JSON.stringify(params.filters)
        : typeof params.filters === "string"
          ? params.filters
          : undefined,
  };

  const response = await axiosInstance.get<Paginated<PackListItem>>(
    packRoutes.list,
    {
      params: requestParams,
    },
  );

  return response.data;
};

export const getPackById = async (
  id: string,
): Promise<PackDetailResponse> => {
  const response = await axiosInstance.get<PackDetailResponse>(
    packRoutes.detail(id),
  );

  return response.data;
};

export const createPack = async (
  payload: CreatePackBody,
): Promise<{ message: string }> => {
  const response = await axiosInstance.post<{ message: string }>(
    packRoutes.create,
    payload,
  );

  return response.data;
};

export const updatePack = async (
  id: string,
  payload: UpdatePackBody,
): Promise<{ message: string }> => {
  const response = await axiosInstance.patch<{ message: string }>(
    packRoutes.detail(id),
    payload,
  );

  return response.data;
};

export const updatePackActive = async (
  id: string,
  payload: { isActive: boolean },
): Promise<{ message: string }> => {
  const response = await axiosInstance.patch<{ message: string }>(
    packRoutes.active(id),
    payload,
  );

  return response.data;
};

export const getPackSearchState = async (): Promise<PackSearchStateResponse> => {
  const response = await axiosInstance.get<PackSearchStateResponse>(
    packRoutes.searchState,
  );

  return response.data;
};

export const savePackSearchMetric = async (
  name: string,
  snapshot: PackSearchSnapshot,
): Promise<{ type: string; message: string }> => {
  const response = await axiosInstance.post<{ type: string; message: string }>(
    packRoutes.searchMetrics,
    {
      name,
      snapshot,
    },
  );

  return response.data;
};

export const deletePackSearchMetric = async (
  metricId: string,
): Promise<{ type: string; message: string }> => {
  const response = await axiosInstance.delete<{ type: string; message: string }>(
    packRoutes.searchMetricDetail(metricId),
  );

  return response.data;
};
