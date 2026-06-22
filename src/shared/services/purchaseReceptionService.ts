import axiosInstance from "@/shared/common/utils/axios";
import { API_PURCHASE_RECEPTIONS_GROUP } from "@/shared/services/APIs";
import type {
  CreatePurchaseReceptionPayload,
  PurchaseReception,
} from "@/features/purchases/types/purchase-reception.types";

export const listPurchaseReceptions = async (purchaseId: string): Promise<PurchaseReception[]> => {
  const response = await axiosInstance.get(API_PURCHASE_RECEPTIONS_GROUP.list, {
    params: { purchaseId },
  });
  return response.data;
};

export const createPurchaseReception = async (
  payload: CreatePurchaseReceptionPayload,
): Promise<{ type: string; message: string; reception?: PurchaseReception }> => {
  const response = await axiosInstance.post(API_PURCHASE_RECEPTIONS_GROUP.create, payload);
  return response.data;
};

export const confirmPurchaseReceptionRecord = async (
  receptionId: string,
): Promise<{ type: string; message: string; reception?: PurchaseReception }> => {
  const response = await axiosInstance.post(API_PURCHASE_RECEPTIONS_GROUP.confirm(receptionId));
  return response.data;
};
