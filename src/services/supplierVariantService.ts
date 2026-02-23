import axiosInstance from "@/common/utils/axios";
import { API_SUPPLIER_VARIANTS_GROUP } from "@/services/APIs";
import type {
  CreateSupplierVariantDto,
  UpdateSupplierVariantDto,
  ListSupplierVariantsQuery,
  SupplierVariantListResponse,
  SupplierVariant,
} from "@/types/supplierVariant";

export const createSupplierVariant = async (payload: CreateSupplierVariantDto): Promise<SupplierVariant> => {
  const response = await axiosInstance.post(API_SUPPLIER_VARIANTS_GROUP.create, payload);
  return response.data;
};

export const updateSupplierVariant = async (
  supplierId: string,
  variantId: string,
  payload: UpdateSupplierVariantDto
): Promise<SupplierVariant> => {
  const response = await axiosInstance.patch(API_SUPPLIER_VARIANTS_GROUP.update(supplierId, variantId), payload);
  return response.data;
};

export const listSupplierVariants = async (
  params: ListSupplierVariantsQuery
): Promise<SupplierVariantListResponse> => {
  const response = await axiosInstance.get(API_SUPPLIER_VARIANTS_GROUP.list, { params });
  return response.data;
};

export const getSupplierVariantById = async (
  supplierId: string,
  variantId: string
): Promise<SupplierVariant> => {
  const response = await axiosInstance.get(API_SUPPLIER_VARIANTS_GROUP.byId(supplierId, variantId));
  return response.data;
};
