import axiosInstance from "@/shared/common/utils/axios";
import { API_SUPPLIERS_GROUP, API_SUPPLIER_PAYMENT_DESTINATIONS_GROUP } from "@/shared/services/APIs";
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
} from "@/features/providers/types/supplier";
import { DocumentType } from "@/features/providers/types/DocumentType";

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

export type SupplierPaymentDestination = {
  supplierPaymentDestinationId: string;
  supplierId: string;
  methodId: string;
  type: "BANK_ACCOUNT" | "DIGITAL_WALLET" | "CARD" | "CASH";
  currency: "PEN" | "USD";
  name: string;
  maskedLabel: string;
  institutionName?: string | null;
  providerName?: string | null;
  accountLastFour?: string | null;
  cciLastFour?: string | null;
  walletIdentifierLastFour?: string | null;
  holderName?: string | null;
  isActive: boolean;
  isDefault: boolean;
  requiresManualReview: boolean;
};

export const listSupplierPaymentDestinations = async (
  supplierId: string,
  options: { includeInactive?: boolean } = {},
): Promise<SupplierPaymentDestination[]> => {
  const response = await axiosInstance.get(
    API_SUPPLIER_PAYMENT_DESTINATIONS_GROUP.listBySupplier(supplierId),
    { params: options.includeInactive ? { includeInactive: true } : undefined },
  );
  return response.data;
};

export const createSupplierPaymentDestination = async (payload: Record<string, unknown>) => {
  const response = await axiosInstance.post(API_SUPPLIER_PAYMENT_DESTINATIONS_GROUP.create, payload);
  return response.data as SupplierPaymentDestination;
};

export const updateSupplierPaymentDestination = async (id: string, payload: Record<string, unknown>) => {
  const response = await axiosInstance.patch(API_SUPPLIER_PAYMENT_DESTINATIONS_GROUP.update(id), payload);
  return response.data as SupplierPaymentDestination;
};

export const setDefaultSupplierPaymentDestination = async (id: string) => {
  const response = await axiosInstance.post(API_SUPPLIER_PAYMENT_DESTINATIONS_GROUP.setDefault(id));
  return response.data as SupplierPaymentDestination;
};


