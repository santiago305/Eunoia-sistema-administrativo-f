import axiosInstance from "@/shared/common/utils/axios";
import type {
  ClientDetail,
  ClientListItem,
  CreateClientBody,
  Paginated,
  UpdateClientBody,
} from "@/features/clients/types/clientApi";
import type { Telephone } from "@/features/clients/types/telephone";
import type {
  ClientSearchSnapshot,
  ClientSearchStateResponse,
} from "@/features/clients/types/clientSearch";

export const listClients = async (params: {
  q?: string;
  page?: number;
  limit?: number;
  filters?: unknown[] | string;
}): Promise<Paginated<ClientListItem>> => {
  const requestParams = {
    ...params,
    filters:
      Array.isArray(params.filters) && params.filters.length
        ? JSON.stringify(params.filters)
        : typeof params.filters === "string"
          ? params.filters
          : undefined,
  };
  const response = await axiosInstance.get<Paginated<ClientListItem>>("/clients", {
    params: requestParams,
  });
  return response.data;
};

export const getClientById = async (id: string): Promise<ClientDetail> => {
  const response = await axiosInstance.get<ClientDetail>(`/clients/${id}`);
  return response.data;
};

export const createClient = async (payload: CreateClientBody): Promise<{ message: string; id?: string }> => {
  const response = await axiosInstance.post<{ message: string; id?: string }>("/clients", payload);
  return response.data;
};

export const updateClient = async (
  id: string,
  payload: UpdateClientBody,
): Promise<{ message: string; id?: string }> => {
  const response = await axiosInstance.patch<{ message: string; id?: string }>(`/clients/${id}`, payload);
  return response.data;
};

export const updateClientActive = async (
  id: string,
  payload: { isActive: boolean },
): Promise<{ message: string }> => {
  const response = await axiosInstance.patch<{ message: string }>(`/clients/${id}/active`, payload);
  return response.data;
};

export const listClientTelephones = async (clientId: string): Promise<Telephone[]> => {
  const response = await axiosInstance.get<Telephone[]>(`/clients/${clientId}/telephones`);
  return response.data;
};

export const createClientTelephone = async (
  clientId: string,
  payload: { number: string; isMain?: boolean },
): Promise<{ message: string }> => {
  const response = await axiosInstance.post<{ message: string }>(
    `/clients/${clientId}/telephones`,
    payload,
  );
  return response.data;
};

export const updateTelephone = async (
  id: string,
  payload: { number: string; isMain?: boolean },
): Promise<{ message: string }> => {
  const response = await axiosInstance.patch<{ message: string }>(`/clients/telephones/${id}`, payload);
  return response.data;
};

export const updateTelephoneActive = async (
  id: string,
  payload: { isActive: boolean },
): Promise<{ message: string }> => {
  const response = await axiosInstance.patch<{ message: string }>(
    `/clients/telephones/${id}/active`,
    payload,
  );
  return response.data;
};

export const setTelephoneMain = async (id: string): Promise<{ message: string }> => {
  const response = await axiosInstance.patch<{ message: string }>(`/clients/telephones/${id}/main`);
  return response.data;
};

export const getClientSearchState = async (): Promise<ClientSearchStateResponse> => {
  const response = await axiosInstance.get<ClientSearchStateResponse>("/clients/search-state");
  return response.data;
};

export const saveClientSearchMetric = async (
  name: string,
  snapshot: ClientSearchSnapshot,
): Promise<{ type: string; message: string }> => {
  const response = await axiosInstance.post<{ type: string; message: string }>("/clients/search-metrics", {
    name,
    snapshot,
  });
  return response.data;
};

export const deleteClientSearchMetric = async (metricId: string): Promise<{ type: string; message: string }> => {
  const response = await axiosInstance.delete<{ type: string; message: string }>(
    `/clients/search-metrics/${metricId}`,
  );
  return response.data;
};
