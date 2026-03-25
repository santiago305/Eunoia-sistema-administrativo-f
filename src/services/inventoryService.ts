import axiosInstance from "@/common/utils/axios";
import { API_INVENTORY_GROUP } from "@/services/APIs";
import type { GetStockQuery, GetStockResponse } from "@/pages/stock/types/inventory";

export const getStock = async (params: GetStockQuery): Promise<GetStockResponse> => {
  const response = await axiosInstance.get(API_INVENTORY_GROUP.getStockQuery(params));
  return response.data;
};
