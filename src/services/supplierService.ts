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
} from "@/types/supplier";
import { DocumentType } from "@/types/DocumentType";

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
  const response = await axiosInstance.get(API_SUPPLIERS_GROUP.list, { params });
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
