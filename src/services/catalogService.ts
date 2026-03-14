import axiosInstance from "@/common/utils/axios";
import { API_PRODUCTS_GROUP, API_VARIANTS_GROUP } from "./APIs";
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
export const listRowMaterials = async (): Promise<PrimaVariant[]> => {
  const res = await axiosInstance.get(API_VARIANTS_GROUP.listRowMaterials);
  return res.data;
};
export const listProduct = async (): Promise<PrimaVariant[]> => {
  const res = await axiosInstance.get(API_VARIANTS_GROUP.listRowMaterials);
  return res.data;
};
export const listFinishedProducts= async (): Promise<PrimaVariant[]> => {
  const res = await axiosInstance.get(API_PRODUCTS_GROUP.productFinisheds);
  return res.data;
};

export const listProductFinishedActives= async (): Promise<ProductListActive[]> => {
  const res = await axiosInstance.get(API_PRODUCTS_GROUP.productFinishedsActive);
  return res.data;
};
export const listProductPrimaActives= async (): Promise<ProductListActive[]> => {
  const res = await axiosInstance.get(API_PRODUCTS_GROUP.productPrimasActive);
  return res.data;
};
export const listFinishedWithRecipes= async (): Promise<PrimaVariant[]> => {
  const res = await axiosInstance.get(API_PRODUCTS_GROUP.finishedWithRecipes);
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



