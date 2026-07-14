import axiosInstance from "@/shared/common/utils/axios";
import type { Paginated } from "@/features/clients/types/clientApi";
import type {
  AgenciesListQuery,
  AgencyDetail,
  AgencyExportColumn,
  AgencyExportPreset,
  AgencyImportCreateResponse,
  AgencyJsonImportRow,
  AgencyListItem,
  CreateAgencyBody,
  SubsidiariesListQuery,
  SubsidiaryDto,
  UpdateAgencyBody,
} from "@/features/agencies/types/agencyApi";
import type {
  AgencySearchSnapshot,
  AgencySearchStateResponse,
} from "@/features/agencies/types/agencySearch";
import { agencyRoutes } from "./APIs";

export const listAgencies = async (
  params: AgenciesListQuery,
): Promise<Paginated<AgencyListItem>> => {
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

export const getAgencyWithSubsidiaries = async (id: string): Promise<AgencyDetail> => {
  const response = await axiosInstance.get<AgencyDetail>(agencyRoutes.withSubsidiaries(id));
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

export const importCreateAgencies = async (
  rows: AgencyJsonImportRow[],
): Promise<AgencyImportCreateResponse> => {
  const response = await axiosInstance.post<AgencyImportCreateResponse>(
    agencyRoutes.importCreate,
    { rows },
  );
  return response.data;
};

export const listSubsidiaries = async (
  params: SubsidiariesListQuery,
): Promise<SubsidiaryDto[]> => {
  const response = await axiosInstance.get<SubsidiaryDto[]>(agencyRoutes.subsidiaries, {
    params,
  });
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

export const getAgencyExportColumns = async (): Promise<AgencyExportColumn[]> => {
  const response = await axiosInstance.get<AgencyExportColumn[]>(agencyRoutes.exportColumns);
  return response.data;
};

export const getAgencyExportPresets = async (): Promise<AgencyExportPreset[]> => {
  const response = await axiosInstance.get<AgencyExportPreset[]>(agencyRoutes.exportPresets);
  return response.data;
};

export const saveAgencyExportPreset = async (payload: {
  name: string;
  columns: AgencyExportColumn[];
}): Promise<{ metricId: string }> => {
  const response = await axiosInstance.post(agencyRoutes.exportPresets, payload);
  return response.data;
};

export const deleteAgencyExportPreset = async (metricId: string): Promise<boolean> => {
  const response = await axiosInstance.delete(agencyRoutes.deleteExportPreset(metricId));
  return response.data;
};

export const exportAgenciesExcel = async (payload: {
  columns: AgencyExportColumn[];
  q?: string;
  filters?: Record<string, unknown>[];
}): Promise<{ blob: Blob; filename: string }> => {
  const response = await axiosInstance.post(agencyRoutes.exportExcel, payload, {
    responseType: "blob",
  });
  const disposition = response.headers["content-disposition"] as string | undefined;
  const match = disposition?.match(/filename="?([^"]+)"?/i);
  const filename = match?.[1] ?? `agencias-${new Date().toISOString().slice(0, 10)}.xlsx`;
  return { blob: response.data as Blob, filename };
};
