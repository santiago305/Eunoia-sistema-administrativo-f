import axiosInstance from "@/common/utils/axios";
import { API_PRODUCTS_GROUP, API_VARIANTS_GROUP } from "./APIs";
import { listSkus } from "@/services/skuService";
import type { ProductType } from "@/pages/catalog/types/ProductTypes";
import {
  CreateVariantResponse,
  CreateVariantDto,
  ListVariantsQuery,
  ListVariantsResponse,
  UpdateVariantActiveDto,
  UpdateVariantDto,
  Variant,
  PrimaVariant,
  ProductListActive,
} from "@/pages/catalog/types/variant";

export const listVariants = async (params: ListVariantsQuery): Promise<ListVariantsResponse> => {
  const res = await axiosInstance.get(API_VARIANTS_GROUP.list, { params });
  return res.data;
};

export const searchProductAndVariant = async (params: {
  q: string;
  raw?: boolean;
  withRecipes?: boolean;
  productType?: ProductType;
  productId?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}): Promise<PrimaVariant[]> => {
  const response = await listSkus({
    q: params.q,
    productType: params.productType,
    productId: params.productId,
    isActive: params.isActive,
    page: params.page,
    limit: params.limit,
  });

  return (response.items ?? []).map((item) => ({
    id: item.sku.id,
    itemId: item.sku.id,
    sku: item.sku.backendSku ?? undefined,
    productName: item.sku.name ?? "",
    productDescription: "",
    unitName: item.unit?.name ?? (item.sku as { baseUnitName?: string }).baseUnitName,
    unitCode: item.unit?.code ?? (item.sku as { baseUnitCode?: string }).baseUnitCode,
    baseUnitId: item.unit?.id ?? (item.sku as { baseUnitId?: string }).baseUnitId,
    unit: item.unit ?? undefined,
    isActive: item.sku.isActive ?? true,
    type: params.productType,
    attributes: Object.fromEntries(item.attributes.map((attr) => [attr.code, attr.value])),
    customSku: item.sku.customSku ?? undefined,
  }));
};
export const listProduct = async (): Promise<PrimaVariant[]> => {
  const res = await axiosInstance.get(API_VARIANTS_GROUP.list);
  return res.data;
};
export const listProductPrimaActives= async (): Promise<ProductListActive[]> => {
  const res = await axiosInstance.get(API_PRODUCTS_GROUP.productPrimasActive);
  return res.data;
};

export const createVariant = async (payload: CreateVariantDto): Promise<CreateVariantResponse> => {
  const response = await axiosInstance.post(API_VARIANTS_GROUP.create, payload);
  return response.data;
};

export const getVariantById = async (id: string): Promise<Variant> => {
  const response = await axiosInstance.get(API_VARIANTS_GROUP.byId(id));
  return response.data;
};
export const getVariantByIdp = async (id: string): Promise<Variant[]> => {
  const response = await axiosInstance.get(API_PRODUCTS_GROUP.byId(id));
  return response.data;
};

export const updateVariant = async (id: string, payload: UpdateVariantDto): Promise<Variant> => {
  const response = await axiosInstance.patch(API_VARIANTS_GROUP.update(id), payload);
  return response.data;
};

export const updateVariantActive = async (
  id: string,
  payload: UpdateVariantActiveDto
): Promise<{ ok: boolean }> => {
  const response = await axiosInstance.patch(API_VARIANTS_GROUP.updateActive(id), payload);
  return response.data;
};



