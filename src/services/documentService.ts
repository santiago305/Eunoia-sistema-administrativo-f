import type { CreateOutOrder, OutOrderResponse } from "@/pages/out-orders/type/outOrder";
import { API_DOCUMENT_INVENTORY_GROUP } from "./APIs";
import axiosInstance from "@/common/utils/axios";
import { AdjustmentResponse, CreateAdjustment } from "@/pages/catalog/types/adjustment";


export const createOutOrder = async (payload: CreateOutOrder): Promise<OutOrderResponse> => {
  const response = await axiosInstance.post(API_DOCUMENT_INVENTORY_GROUP.outOrderCreated, payload);
  return response.data;
};

export const createAdjustment = async (payload: CreateAdjustment): Promise<AdjustmentResponse> => {
  const response = await axiosInstance.post(API_DOCUMENT_INVENTORY_GROUP.adjustmentCreated, payload);
  return response.data;
};

export const createTransfer = async (payload: CreateAdjustment): Promise<AdjustmentResponse> => {
  const response = await axiosInstance.post(API_DOCUMENT_INVENTORY_GROUP.transfertCreated, payload);
  return response.data;
};