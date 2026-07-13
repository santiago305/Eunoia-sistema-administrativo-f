import axiosInstance from "@/shared/common/utils/axios";
import { API_RECURRING_PURCHASES_GROUP } from "@/shared/services/APIs";
import type {
  CreateRecurringPurchasePayload,
  ListRecurringPurchasesQuery,
  ListRecurringPurchasesResponse,
  RegisterRecurringPurchasePaymentPayload,
  RegisterRecurringPurchasePaymentResponse,
  RecurringPurchase,
  RecurringPurchaseExportColumn,
  RecurringPurchaseExportPreset,
  RecurringPurchaseSearchSnapshot,
  RecurringPurchaseSearchStateResponse,
} from "@/features/purchases/types/recurring-purchase.types";

export const listRecurringPurchases = async (
  query: ListRecurringPurchasesQuery = {},
): Promise<ListRecurringPurchasesResponse> => {
  const params = {
    ...query,
    filters:
      Array.isArray(query.filters) && query.filters.length
        ? JSON.stringify(query.filters)
        : typeof query.filters === "string"
          ? query.filters
          : undefined,
  };
  const response = await axiosInstance.get<ListRecurringPurchasesResponse>(
    API_RECURRING_PURCHASES_GROUP.list,
    { params },
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

export const getRecurringPurchaseSearchState = async (): Promise<RecurringPurchaseSearchStateResponse> => {
  const response = await axiosInstance.get<RecurringPurchaseSearchStateResponse>(
    API_RECURRING_PURCHASES_GROUP.searchState,
  );
  return response.data;
};

export const getRecurringPurchaseExportColumns = async (): Promise<RecurringPurchaseExportColumn[]> => {
  const response = await axiosInstance.get<RecurringPurchaseExportColumn[]>(
    API_RECURRING_PURCHASES_GROUP.exportColumns,
  );
  return response.data;
};

export const getRecurringPurchaseExportPresets = async (): Promise<RecurringPurchaseExportPreset[]> => {
  const response = await axiosInstance.get<RecurringPurchaseExportPreset[]>(
    API_RECURRING_PURCHASES_GROUP.exportPresets,
  );
  return response.data;
};

export const saveRecurringPurchaseExportPreset = async (payload: {
  name: string;
  columns: RecurringPurchaseExportColumn[];
}): Promise<{ metricId: string }> => {
  const response = await axiosInstance.post(API_RECURRING_PURCHASES_GROUP.exportPresets, payload);
  return response.data;
};

export const deleteRecurringPurchaseExportPreset = async (metricId: string): Promise<boolean> => {
  const response = await axiosInstance.delete(API_RECURRING_PURCHASES_GROUP.deleteExportPreset(metricId));
  return response.data;
};

export const exportRecurringPurchasesExcel = async (payload: {
  columns: RecurringPurchaseExportColumn[];
  q?: string;
  filters?: RecurringPurchaseSearchSnapshot["filters"];
}): Promise<{ blob: Blob; filename: string }> => {
  const response = await axiosInstance.post(API_RECURRING_PURCHASES_GROUP.exportExcel, payload, {
    responseType: "blob",
  });
  const disposition = response.headers["content-disposition"] as string | undefined;
  const match = disposition?.match(/filename="?([^"]+)"?/i);
  const filename = match?.[1] ?? `compras-recurrentes-${new Date().toISOString().slice(0, 10)}.xlsx`;
  return { blob: response.data as Blob, filename };
};

export const saveRecurringPurchaseSearchMetric = async (
  name: string,
  snapshot: RecurringPurchaseSearchSnapshot,
): Promise<{ type: string; message: string }> => {
  const response = await axiosInstance.post(API_RECURRING_PURCHASES_GROUP.saveSearchMetric, {
    name,
    snapshot,
  });
  return response.data;
};

export const deleteRecurringPurchaseSearchMetric = async (
  metricId: string,
): Promise<{ type: string; message: string }> => {
  const response = await axiosInstance.delete(API_RECURRING_PURCHASES_GROUP.deleteSearchMetric(metricId));
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

export const registerRecurringPurchasePayment = async (
  id: string,
  payload: RegisterRecurringPurchasePaymentPayload,
): Promise<RegisterRecurringPurchasePaymentResponse> => {
  const response = await axiosInstance.post<RegisterRecurringPurchasePaymentResponse>(
    API_RECURRING_PURCHASES_GROUP.registerPayment(id),
    payload,
  );
  return response.data;
};
