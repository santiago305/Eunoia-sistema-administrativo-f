import axiosInstance from "@/shared/common/utils/axios";
import { API_PAYMENT_GROUP } from "@/shared/services/APIs";
import type {
  Payment,
} from "@/features/purchases/types/purchase";
import type {
  PaymentSearchFilters,
  PaymentSearchSnapshot,
  PaymentSearchStateResponse,
} from "@/features/payments/types/payment-search.types";

export type ListPaymentsQuery = {
  poId?: string;
  quotaId?: string;
  status?: "SCHEDULED" | "PENDING_APPROVAL" | "APPROVED" | "REJECTED";
  page?: number;
  limit?: number;
  q?: string;
  filters?: PaymentSearchFilters;
};

export type ListPaymentsResponse = {
  items: Payment[];
  total: number;
  page: number;
  limit: number;
};

export type PaymentExportColumn = {
  key: string;
  label: string;
};

export const createPayment = async (
  payload: Payment
): Promise<{type:string, message:string, paymentId?: string}> => {
  const response = await axiosInstance.post(API_PAYMENT_GROUP.create, payload);
  return response.data;
};

export const listPayments = async (query: ListPaymentsQuery = {}): Promise<ListPaymentsResponse> => {
  const response = await axiosInstance.get<ListPaymentsResponse>(API_PAYMENT_GROUP.list, {
    params: {
      ...query,
      filters: query.filters?.length ? JSON.stringify(query.filters) : undefined,
    },
  });
  return response.data;
};

export const getPaymentSearchState = async (): Promise<PaymentSearchStateResponse> => {
  const response = await axiosInstance.get(API_PAYMENT_GROUP.searchState);
  return response.data;
};

export const savePaymentSearchMetric = async (
  name: string,
  snapshot: PaymentSearchSnapshot,
): Promise<{ type: string; message: string }> => {
  const response = await axiosInstance.post(API_PAYMENT_GROUP.saveSearchMetric, {
    name,
    snapshot,
  });
  return response.data;
};

export const deletePaymentSearchMetric = async (
  metricId: string,
): Promise<{ type: string; message: string }> => {
  const response = await axiosInstance.delete(API_PAYMENT_GROUP.deleteSearchMetric(metricId));
  return response.data;
};

export const getPaymentExportColumns = async (): Promise<PaymentExportColumn[]> => {
  const response = await axiosInstance.get(API_PAYMENT_GROUP.exportColumns);
  return response.data;
};

export const getPaymentExportPresets = async (): Promise<Array<{ metricId: string; name: string; snapshot: { columns?: PaymentExportColumn[] } }>> => {
  const response = await axiosInstance.get(API_PAYMENT_GROUP.exportPresets);
  return response.data;
};

export const savePaymentExportPreset = async (payload: {
  name: string;
  columns: PaymentExportColumn[];
}): Promise<{ metricId: string }> => {
  const response = await axiosInstance.post(API_PAYMENT_GROUP.exportPresets, payload);
  return response.data;
};

export const deletePaymentExportPreset = async (metricId: string): Promise<boolean> => {
  const response = await axiosInstance.delete(API_PAYMENT_GROUP.deleteExportPreset(metricId));
  return response.data;
};

export const exportPaymentsExcel = async (payload: {
  columns: PaymentExportColumn[];
  q?: string;
  filters?: Record<string, unknown>[];
}): Promise<{ blob: Blob; filename: string }> => {
  const response = await axiosInstance.post(API_PAYMENT_GROUP.exportExcel, payload, {
    responseType: "blob",
  });
  const disposition = response.headers["content-disposition"] as string | undefined;
  const match = disposition?.match(/filename="?([^"]+)"?/i);
  const filename = match?.[1] ?? `pagos-${new Date().toISOString().slice(0, 10)}.xlsx`;
  return { blob: response.data as Blob, filename };
};

export const getPaymentById = async (id: string): Promise<Payment> => {
  const response = await axiosInstance.get<Payment>(API_PAYMENT_GROUP.byId(id));
  return response.data;
};

export const removePayment = async (id:string): Promise<{type:String, message:string}> => {
  const response = await axiosInstance.delete(API_PAYMENT_GROUP.remove(id));
  return response.data;
}

export const approvePayment = async (id: string): Promise<{ type: string; message: string }> => {
  const response = await axiosInstance.post(API_PAYMENT_GROUP.approve(id));
  return response.data;
};

export const rejectPayment = async (id: string, reason?: string): Promise<{ type: string; message: string }> => {
  const response = await axiosInstance.post(API_PAYMENT_GROUP.reject(id), { reason });
  return response.data;
};




