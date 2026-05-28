import axiosInstance from "@/shared/common/utils/axios";
import { API_SALE_ORDERS_GROUP } from "@/shared/services/APIs";
import type { CreateSaleOrderDto, CreateSaleOrderResponse } from "@/features/sale-orders/types/saleOrder";

export const createSaleOrder = async (payload: CreateSaleOrderDto): Promise<CreateSaleOrderResponse> => {
  const response = await axiosInstance.post<CreateSaleOrderResponse>(API_SALE_ORDERS_GROUP.create, payload);
  return response.data;
};

