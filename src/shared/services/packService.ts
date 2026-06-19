import axiosInstance from "@/shared/common/utils/axios";
import type {
  CreatePackBody,
  PackIdDomain,
  Paginated,
  PackDetailResponse,
  PackListEntry,
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
}): Promise<Paginated<PackListEntry>> => {
  const requestParams = {
    ...params,
    filters:
      Array.isArray(params.filters) && params.filters.length
        ? JSON.stringify(params.filters)
        : typeof params.filters === "string"
          ? params.filters
          : undefined,
  };

  const response = await axiosInstance.get<Paginated<PackListEntry>>(
    packRoutes.list,
    {
      params: requestParams,
    },
  );

  return response.data;
};

export const getPackById = async (
  id: string | PackIdDomain,
): Promise<PackDetailResponse> => {
  const normalizedId = typeof id === "string" ? id : id?.value;
  if (!normalizedId) {
    throw new Error("Pack ID inválido.");
  }

  const response = await axiosInstance.get<
    PackDetailResponse | { data: PackDetailResponse }
  >(packRoutes.detail(normalizedId));

  const data = response.data;
  if ("data" in data) return data.data;
  return data;
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

export const getPackExportColumns = async (params: {
  q?: string;
  filters?: unknown[] | string;
}): Promise<Array<{ key: string; label: string }>> => {
  const response = await axiosInstance.get(packRoutes.exportColumns, {
    params: {
      ...params,
      filters:
        Array.isArray(params.filters) && params.filters.length
          ? JSON.stringify(params.filters)
          : typeof params.filters === "string"
            ? params.filters
            : undefined,
    },
  });
  return response.data;
};

export const getPackExportPresets = async (): Promise<Array<{ metricId: string; name: string; snapshot: any }>> => {
  const response = await axiosInstance.get(packRoutes.exportPresets);
  return response.data;
};

export const savePackExportPreset = async (payload: {
  name: string;
  columns: Array<{ key: string; label: string }>;
}) => {
  const response = await axiosInstance.post(packRoutes.exportPresets, payload);
  return response.data;
};

export const deletePackExportPreset = async (metricId: string) => {
  const response = await axiosInstance.delete(packRoutes.deleteExportPreset(metricId));
  return response.data;
};

export const exportPackExcel = async (payload: {
  q?: string;
  filters?: unknown[] | string;
  columns: Array<{ key: string; label: string }>;
}): Promise<{ blob: Blob; filename: string }> => {
  const response = await axiosInstance.post(
    packRoutes.exportExcel,
    {
      ...payload,
      filters:
        Array.isArray(payload.filters) && payload.filters.length
          ? payload.filters
          : typeof payload.filters === "string"
            ? payload.filters
            : undefined,
    },
    { responseType: "blob" },
  );
  const disposition = response.headers["content-disposition"] as string | undefined;
  const match = disposition?.match(/filename="?([^"]+)"?/i);
  const filename = match?.[1] ?? `packs-${new Date().toISOString().slice(0, 10)}.xlsx`;
  return { blob: response.data as Blob, filename };
};
