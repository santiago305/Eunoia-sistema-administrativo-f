import axiosInstance from "@/common/utils/axios";
import { API_DOCUMENT_INVENTORY_GROUP } from "@/services/APIs";
import type { AdjustmentResponse, CreateAdjustment } from "@/pages/catalog/types/adjustment";

export const createAdjustment = async (payload: CreateAdjustment): Promise<AdjustmentResponse> => {
  const response = await axiosInstance.post(API_DOCUMENT_INVENTORY_GROUP.adjustmentCreated, payload);
  return response.data;
};
