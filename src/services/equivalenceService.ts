import axiosInstance from "@/common/utils/axios";
import { API_PRODUCT_EQUIVALENCES_GROUP } from "@/services/APIs";
import type {
  CreateProductEquivalenceDto,
  ListProductEquivalencesQuery,
  ListProductEquivalencesResponse,
  ProductEquivalence,
} from "@/types/equivalence";

export const listProductEquivalences = async (
  params: ListProductEquivalencesQuery
): Promise<ListProductEquivalencesResponse> => {
  const response = await axiosInstance.get(API_PRODUCT_EQUIVALENCES_GROUP.list, { params });
  return response.data;
};

export const createProductEquivalence = async (
  payload: CreateProductEquivalenceDto
): Promise<ProductEquivalence> => {
  const response = await axiosInstance.post(API_PRODUCT_EQUIVALENCES_GROUP.create, payload);
  return response.data;
};

export const deleteProductEquivalence = async (id: string): Promise<void> => {
  await axiosInstance.delete(API_PRODUCT_EQUIVALENCES_GROUP.delete(id));
};
