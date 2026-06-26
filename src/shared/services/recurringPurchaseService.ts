import axiosInstance from "@/shared/common/utils/axios";
import { API_RECURRING_PURCHASES_GROUP } from "@/shared/services/APIs";
import type {
  CreateRecurringPurchasePayload,
  ListRecurringPurchasesQuery,
  ListRecurringPurchasesResponse,
  RecurringPurchase,
} from "@/features/purchases/types/recurring-purchase.types";

export const listRecurringPurchases = async (
  query: ListRecurringPurchasesQuery = {},
): Promise<ListRecurringPurchasesResponse> => {
  const response = await axiosInstance.get<ListRecurringPurchasesResponse>(
    API_RECURRING_PURCHASES_GROUP.list,
    { params: query },
  );
  return response.data;
};

export const createRecurringPurchase = async (
  payload: CreateRecurringPurchasePayload,
): Promise<RecurringPurchase> => {
  const response = await axiosInstance.post<RecurringPurchase>(
    API_RECURRING_PURCHASES_GROUP.create,
    payload,
  );
  return response.data;
};

export const pauseRecurringPurchase = async (id: string): Promise<RecurringPurchase> => {
  const response = await axiosInstance.patch<RecurringPurchase>(API_RECURRING_PURCHASES_GROUP.pause(id));
  return response.data;
};

export const resumeRecurringPurchase = async (id: string): Promise<RecurringPurchase> => {
  const response = await axiosInstance.patch<RecurringPurchase>(API_RECURRING_PURCHASES_GROUP.resume(id));
  return response.data;
};

export const cancelRecurringPurchase = async (id: string): Promise<RecurringPurchase> => {
  const response = await axiosInstance.patch<RecurringPurchase>(API_RECURRING_PURCHASES_GROUP.cancel(id));
  return response.data;
};

export const generateCurrentRecurringPayable = async (
  id: string,
): Promise<{ generated: boolean; purchaseId?: string; accountPayableId?: string; reason?: string }> => {
  const response = await axiosInstance.post(API_RECURRING_PURCHASES_GROUP.generateCurrentPayable(id));
  return response.data;
};
