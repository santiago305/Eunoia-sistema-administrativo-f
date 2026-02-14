import axiosInstance from "@/common/utils/axios";
import { API_VARIANTS_GROUP } from "./APIs";
import {
  CreateVariantResponse,
  CreateVariantDto,
  ListVariantsQuery,
  ListVariantsResponse,
  UpdateVariantActiveDto,
  UpdateVariantDto,
  Variant,
} from "@/types/variant";

export const listVariants = async (params: ListVariantsQuery): Promise<ListVariantsResponse> => {
  const res = await axiosInstance.get(API_VARIANTS_GROUP.list, { params });
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

