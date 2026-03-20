import type { CreateOutOrder, OutOrderResponse } from "@/pages/out-orders/type/outOrder";
import { API_DOCUMENT_INVENTORY_GROUP } from "./APIs";
import axiosInstance from "@/common/utils/axios";


export const createOutOrder = async (payload: CreateOutOrder): Promise<OutOrderResponse> => {
  const response = await axiosInstance.post(API_DOCUMENT_INVENTORY_GROUP.outOrderCreated, payload);
  return response.data;
};