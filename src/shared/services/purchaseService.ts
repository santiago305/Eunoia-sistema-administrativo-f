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

