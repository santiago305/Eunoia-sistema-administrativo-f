import axiosInstance from "@/shared/common/utils/axios";
import type { Paginated } from "@/features/clients/types/clientApi";
import type { SourceDetail, SourceListItem, CreateSourceBody, UpdateSourceBody, SourcesListQuery } from "@/features/sources/types/sourceApi";
import type { SourceSearchSnapshot, SourceSearchStateResponse } from "@/features/sources/types/sourceSearch";
import { sourceRoutes } from "./APIs";
import type {
  SaveSourceRecognitionCodeInput,
  SourceRecognitionCode,
  SourceRecognitionCodesResponse,
} from "@/features/sources/types/source";

export const listSources = async (params: SourcesListQuery): Promise<Paginated<SourceListItem>> => {
  const requestParams = {
    ...params,
    filters:
      Array.isArray(params.filters) && params.filters.length
        ? JSON.stringify(params.filters)
        : typeof params.filters === "string"
          ? params.filters
          : undefined,
  };

  const response = await axiosInstance.get<Paginated<SourceListItem>>(sourceRoutes.list, {
    params: requestParams,
  });

  return response.data;
};

export const getSourceById = async (id: string): Promise<SourceDetail> => {
  const response = await axiosInstance.get<SourceDetail>(sourceRoutes.detail(id));
  return response.data;
};

export const createSource = async (payload: CreateSourceBody): Promise<{ message: string; id?: string }> => {
  const response = await axiosInstance.post<{ message: string; id?: string }>(sourceRoutes.create, payload);
  return response.data;
};

export const updateSource = async (id: string, payload: UpdateSourceBody): Promise<{ message: string; id?: string }> => {
  const response = await axiosInstance.patch<{ message: string; id?: string }>(sourceRoutes.update(id), payload);
  return response.data;
};

export const updateSourceActive = async (id: string, payload: { isActive: boolean }): Promise<{ message: string }> => {
  const response = await axiosInstance.patch<{ message: string }>(sourceRoutes.active(id), payload);
  return response.data;
};

export const listSourceRecognitionCodes = async (
  sourceId: string,
  params: { page?: number; limit?: number; q?: string },
): Promise<SourceRecognitionCodesResponse> => {
  const response = await axiosInstance.get<SourceRecognitionCodesResponse>(
    sourceRoutes.recognitionCodes(sourceId),
    { params },
  );
  return response.data;
};

export const createSourceRecognitionCode = async (
  sourceId: string,
  payload: SaveSourceRecognitionCodeInput,
): Promise<SourceRecognitionCode> => {
  const response = await axiosInstance.post<SourceRecognitionCode>(
    sourceRoutes.recognitionCodes(sourceId),
    payload,
  );
  return response.data;
};

export const updateSourceRecognitionCode = async (
  sourceId: string,
  codeId: string,
  payload: SaveSourceRecognitionCodeInput,
): Promise<SourceRecognitionCode> => {
  const response = await axiosInstance.patch<SourceRecognitionCode>(
    sourceRoutes.recognitionCode(sourceId, codeId),
    payload,
  );
  return response.data;
};

export const deleteSourceRecognitionCode = async (
  sourceId: string,
  codeId: string,
): Promise<{ id: string; deleted: boolean }> => {
  const response = await axiosInstance.delete<{ id: string; deleted: boolean }>(
    sourceRoutes.recognitionCode(sourceId, codeId),
  );
  return response.data;
};

export const getSourceSearchState = async (): Promise<SourceSearchStateResponse> => {
  const response = await axiosInstance.get<SourceSearchStateResponse>(sourceRoutes.searchState);
  return response.data;
};

export const saveSourceSearchMetric = async (
  name: string,
  snapshot: SourceSearchSnapshot,
): Promise<{ type: string; message: string }> => {
  const response = await axiosInstance.post<{ type: string; message: string }>(sourceRoutes.searchMetrics, {
    name,
    snapshot,
  });

  return response.data;
};

export const deleteSourceSearchMetric = async (metricId: string): Promise<{ type: string; message: string }> => {
  const response = await axiosInstance.delete<{ type: string; message: string }>(
    sourceRoutes.searchMetricDetail(metricId),
  );

  return response.data;
};

