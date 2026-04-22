import axiosInstance from "@/common/utils/axios";
import { API_SUPPLIERS_GROUP } from "@/services/APIs";
import type {
  CreateSupplierDto,
  UpdateSupplierDto,
  UpdateSupplierActiveDto,
  ListSuppliersQuery,
  SupplierListResponse,
  Supplier,
  SupplierIdentityLookupResult,
  ProviderSearchSnapshot,
  ProviderSearchStateResponse,
} from "@/pages/providers/types/supplier";
import { DocumentType } from "@/pages/providers/types/DocumentType";

export const createSupplier = async (payload: CreateSupplierDto): Promise<Supplier> => {
  const response = await axiosInstance.post(API_SUPPLIERS_GROUP.create, payload);
  return response.data;
};

export const updateSupplier = async (id: string, payload: UpdateSupplierDto): Promise<Supplier> => {
  const response = await axiosInstance.patch(API_SUPPLIERS_GROUP.update(id), payload);
  return response.data;
};

export const updateSupplierActive = async (
  id: string,
  payload: UpdateSupplierActiveDto
): Promise<{ ok: boolean }> => {
  const response = await axiosInstance.patch(API_SUPPLIERS_GROUP.updateActive(id), payload);
  return response.data;
};

export const listSuppliers = async (params: ListSuppliersQuery): Promise<SupplierListResponse> => {
  const requestParams = {
    ...params,
    filters:
      Array.isArray(params.filters) && params.filters.length
        ? JSON.stringify(params.filters)
        : typeof params.filters === "string"
          ? params.filters
          : undefined,
  };
  const response = await axiosInstance.get(API_SUPPLIERS_GROUP.list, { params: requestParams });
  return response.data;
};

export const getProviderSearchState = async (): Promise<ProviderSearchStateResponse> => {
  const response = await axiosInstance.get(API_SUPPLIERS_GROUP.searchState);
  return response.data;
};

export const saveProviderSearchMetric = async (
  name: string,
  snapshot: ProviderSearchSnapshot,
): Promise<{ type: string; message: string }> => {
  const response = await axiosInstance.post(API_SUPPLIERS_GROUP.saveSearchMetric, {
    name,
    snapshot,
  });
  return response.data;
};

export const deleteProviderSearchMetric = async (
  metricId: string,
): Promise<{ type: string; message: string }> => {
  const response = await axiosInstance.delete(API_SUPPLIERS_GROUP.deleteSearchMetric(metricId));
  return response.data;
};

export const getSupplierById = async (id: string): Promise<Supplier> => {
  const response = await axiosInstance.get(API_SUPPLIERS_GROUP.byId(id));
  return response.data;
};

export const lookupSupplierIdentity = async (params: {
  documentType: DocumentType;
  documentNumber: string;
}): Promise<SupplierIdentityLookupResult> => {
  const response = await axiosInstance.get(API_SUPPLIERS_GROUP.identityLookup, { params });
  return response.data;
};


