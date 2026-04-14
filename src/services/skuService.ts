import axiosInstance from "@/common/utils/axios";
import { API_PRODUCTS_GROUP, API_SKUS_GROUP } from "@/services/APIs";
import type { ListSkusQuery, ListSkusResponse } from "@/pages/catalog/types/product";

export const listSkus = async (params: ListSkusQuery = {}): Promise<ListSkusResponse> => {
  const response = await axiosInstance.get(API_SKUS_GROUP.base, { params });
  return response.data;
};

export const listProductSkus = async (
  productId: string,
  params: Omit<ListSkusQuery, "productId"> = {},
): Promise<ListSkusResponse> => {
  const response = await axiosInstance.get(API_PRODUCTS_GROUP.createSku(productId), { params });
  return response.data;
};
