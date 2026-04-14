import axiosInstance from "@/common/utils/axios";
import { API_PRODUCT_EQUIVALENCES_GROUP } from "@/services/APIs";
import type {
  CreateProductEquivalenceDto,
  ListProductEquivalencesResponse,
  ProductEquivalence,
} from "@/pages/catalog/types/equivalence";

export const listProductEquivalences = async (
  productId: string
): Promise<ListProductEquivalencesResponse> => {
  const response = await axiosInstance.get(API_PRODUCT_EQUIVALENCES_GROUP.byProduct(productId));
  return response.data;
};

export const createProductEquivalence = async (
  productId: string,
  payload: CreateProductEquivalenceDto
): Promise<ProductEquivalence> => {
  const response = await axiosInstance.post(
    API_PRODUCT_EQUIVALENCES_GROUP.byProduct(productId),
    payload,
  );
  return response.data;
};

export const deleteProductEquivalence = async (id: string): Promise<void> => {
  await axiosInstance.delete(API_PRODUCT_EQUIVALENCES_GROUP.byId(id));
};


