import axiosInstance from "@/shared/common/utils/axios";
import { API_PURCHASE_GROUP } from "@/shared/services/APIs";
import type {
  CreatePurchaseOrderDto,
  CreditQuota,
  ListPurchaseOrdersQuery,
  Payment,
  PurchaseOrder,
  PurchaseOrderListResponse,
  PurchaseSearchSnapshot,
  PurchaseSearchStateResponse,
  PurchaseExportColumn,
  UpdatePurchaseOrderDto,
} from "@/features/purchases/types/purchase";
import type { PurchaseOrderDetailOutput } from "@/features/purchases/types/itemPurchaseEdit";

export const createPurchaseOrder = async (
  payload: CreatePurchaseOrderDto
): Promise<{type:string, message:string, order?:PurchaseOrder}> => {
  const response = await axiosInstance.post(API_PURCHASE_GROUP.create, payload);
  return response.data;
};

export const listPurchaseOrders = async (
  params: ListPurchaseOrdersQuery
): Promise<PurchaseOrderListResponse> => {
  const requestParams = {
    ...params,
    filters: params.filters?.length ? JSON.stringify(params.filters) : undefined,
  };
  const response = await axiosInstance.get(API_PURCHASE_GROUP.list, { params: requestParams });
  return response.data;
};

export const getPurchaseSearchState = async (): Promise<PurchaseSearchStateResponse> => {
  const response = await axiosInstance.get(API_PURCHASE_GROUP.searchState);
  return response.data;
};

export const getPurchaseHistorySearchState = async (): Promise<PurchaseSearchStateResponse> => {
  return getPurchaseSearchState();
};

export const getPurchaseExportColumns = async (): Promise<PurchaseExportColumn[]> => {
  const response = await axiosInstance.get(API_PURCHASE_GROUP.exportColumns);
  return response.data;
};

export const getPurchaseExportPresets = async (): Promise<Array<{ metricId: string; name: string; snapshot: any }>> => {
  const response = await axiosInstance.get(API_PURCHASE_GROUP.exportPresets);
  return response.data;
};

export const savePurchaseExportPreset = async (payload: {
  name: string;
  columns: PurchaseExportColumn[];
  useDateRange?: boolean;
}): Promise<{ metricId: string }> => {
  const response = await axiosInstance.post(API_PURCHASE_GROUP.exportPresets, payload);
  return response.data;
};

export const deletePurchaseExportPreset = async (metricId: string): Promise<boolean> => {
  const response = await axiosInstance.delete(API_PURCHASE_GROUP.deleteExportPreset(metricId));
  return response.data;
};

export const exportPurchaseOrdersExcel = async (payload: {
  columns: PurchaseExportColumn[];
  q?: string;
  filters?: Record<string, unknown>[];
  from?: string;
  to?: string;
  useDateRange?: boolean;
}): Promise<{ blob: Blob; filename: string }> => {
  const response = await axiosInstance.post(API_PURCHASE_GROUP.exportExcel, payload, {
    responseType: "blob",
  });
  const disposition = response.headers["content-disposition"] as string | undefined;
  const match = disposition?.match(/filename="?([^"]+)"?/i);
  const filename = match?.[1] ?? `compras-${new Date().toISOString().slice(0, 10)}.xlsx`;
  return { blob: response.data as Blob, filename };
};

export const savePurchaseSearchMetric = async (
  name: string,
  snapshot: PurchaseSearchSnapshot,
): Promise<{ type: string; message: string }> => {
  const response = await axiosInstance.post(API_PURCHASE_GROUP.saveSearchMetric, {
    name,
    snapshot,
  });
  return response.data;
};

export const deletePurchaseSearchMetric = async (
  metricId: string,
): Promise<{ type: string; message: string }> => {
  const response = await axiosInstance.delete(API_PURCHASE_GROUP.deleteSearchMetric(metricId));
  return response.data;
};

export const setSentPurchase = async (id:string): Promise<{type:string, message:string}> => {
  const response = await axiosInstance.patch(API_PURCHASE_GROUP.setSent(id));
  return response.data;
};
export const setCancelPurchase = async (id:string): Promise<{type:string, message:string}> => {
  const response = await axiosInstance.patch(API_PURCHASE_GROUP.setCancel(id));
  return response.data;
};

export const enterPurchaseOrder = async (id:string): Promise<{type:string, message:string}> => {
  const response = await axiosInstance.post(API_PURCHASE_GROUP.enterPurchase(id));
  return response.data;
};

export const listPurchaseHistory = async (
  params: ListPurchaseOrdersQuery & {
    eventType?: string;
    eventFrom?: string;
    eventTo?: string;
    performedByUserId?: string;
  }
): Promise<PurchaseOrderListResponse & { items: Array<PurchaseOrder & { history?: { eventsCount: number; lastEventAt: string | null } }> }> => {
  const requestParams = {
    ...params,
    filters: params.filters?.length ? JSON.stringify(params.filters) : undefined,
  };
  const response = await axiosInstance.get(API_PURCHASE_GROUP.history, { params: requestParams });
  return response.data;
};

export const getPurchaseTimeline = async (
  poId: string,
  params?: {
    eventType?: string;
    performedByUserId?: string;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
  },
): Promise<{
  purchaseId: string;
  events: Array<Record<string, unknown>>;
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
  hasPrev?: boolean;
  hasNext?: boolean;
}> => {
  const response = await axiosInstance.get(API_PURCHASE_GROUP.purchaseHistory(poId), { params });
  return response.data;
};

export const requestProcessingPurchaseOrder = async (
  id: string,
  reason?: string
): Promise<{ type: string; message: string }> => {
  const response = await axiosInstance.post(API_PURCHASE_GROUP.requestProcessing(id), { reason });
  return response.data;
};

export const validatePurchaseOrderNumber = async (params: {
  serie: string;
  correlative: number;
  excludePoId?: string;
}): Promise<{ exists: boolean }> => {
  const response = await axiosInstance.get(API_PURCHASE_GROUP.validateNumber, { params });
  return response.data;
};

export const approveProcessingPurchaseOrder = async (
  id: string,
  comment?: string
): Promise<{ type: string; message: string }> => {
  const response = await axiosInstance.post(API_PURCHASE_GROUP.approveProcessing(id), { comment });
  return response.data;
};

export const rejectProcessingPurchaseOrder = async (
  id: string,
  comment?: string
): Promise<{ type: string; message: string }> => {
  const response = await axiosInstance.post(API_PURCHASE_GROUP.rejectProcessing(id), { comment });
  return response.data;
};

export const approveCreationWithPayment = async (
  id: string,
): Promise<{ type: string; message: string }> => {
  const response = await axiosInstance.post(API_PURCHASE_GROUP.approveCreationWithPayment(id));
  return response.data;
};

export const rejectCreationWithPayment = async (
  id: string,
  reason?: string,
): Promise<{ type: string; message: string }> => {
  const response = await axiosInstance.post(API_PURCHASE_GROUP.rejectCreationWithPayment(id), { reason });
  return response.data;
};

export const confirmPurchaseReception = async (id: string): Promise<{ type: string; message: string }> => {
  const response = await axiosInstance.post(API_PURCHASE_GROUP.confirmReception(id));
  return response.data;
};

export const listPayments = async (id:string): Promise<Payment[]> => {
  const response = await axiosInstance.get(API_PURCHASE_GROUP.listPayments(id));
  return response.data;
};

export const listQuotas = async (id:string): Promise<CreditQuota[]> => {
  const response = await axiosInstance.get(API_PURCHASE_GROUP.listQuotas(id));
  return response.data;
};

export const updatePurchaseOrder = async (
  poId: string,
  payload: UpdatePurchaseOrderDto
): Promise<{type:string, message:string, order?:PurchaseOrder}> => {
  const response = await axiosInstance.patch(API_PURCHASE_GROUP.update(poId), payload);
  return response.data;
};

export const getById = async (id: string): Promise<PurchaseOrderDetailOutput> => {
  const response = await axiosInstance.get(API_PURCHASE_GROUP.getById(id));
  return response.data;
};

