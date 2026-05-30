import axiosInstance from "@/shared/common/utils/axios";
import { API_SALE_ORDERS_GROUP } from "@/shared/services/APIs";
import type {
  CreateSaleOrderDto,
  CreateSaleOrderResponse,
  SaleOrder,
  SaleOrderListResponse,
  SaleOrderPayment,
  SaleOrderSearchSnapshot,
  SaleOrderSearchStateResponse,
} from "@/features/sale-orders/types/saleOrder";

export type CancelSaleOrderResponse = {
  saleOrderId: string;
  agendaStatus: "CANCELED";
  deliveryStatus: "CANCELED";
};

export type CreateSaleOrderPaymentDto = {
  bankAccountId: string;
  method: string;
  amount: number;
  date?: string;
  operationNumber?: string;
  note?: string;
};

export type ConfirmSaleOrderDeliveryResponse = {
  saleOrderId: string;
  deliveryStatus: "DELIVERED";
};
export type SaleOrderItemComponentOutput = {
  id: string;
  saleOrderItemId: string;
  sku: {
    id: string;
    name: string;
    backendSku: string;
    customSku: string | null;
    barcode: string | null;
    image: string | null;
    attributes: Array<{
      code: string;
      name: string;
      value: string;
    }>;
  };
  referencePackItemId: string | null;
  quantity: number;
  unitPrice: number;
  total: number;
  createdAt: string;
};

export type SaleOrderComponentsOutput = {
  saleOrderId: string;
  items: Array<{
    saleOrderItemId: string;
    components: SaleOrderItemComponentOutput[];
  }>;
};

export const getSaleOrderItemComponents = async (
  itemId: string,
): Promise<SaleOrderComponentsOutput> => {
  const response = await axiosInstance.get(
    API_SALE_ORDERS_GROUP.itemComponents(itemId),
  );
  return response.data;
};

export const createSaleOrder = async (payload: CreateSaleOrderDto): Promise<CreateSaleOrderResponse> => {
  const response = await axiosInstance.post<CreateSaleOrderResponse>(API_SALE_ORDERS_GROUP.create, payload);
  return response.data;
};

export const listSaleOrders = async (params: {
  q?: string;
  page?: number;
  limit?: number;
  filters?: unknown[] | string;
}): Promise<SaleOrderListResponse> => {
  const requestParams = {
    ...params,
    filters:
      Array.isArray(params.filters) && params.filters.length
        ? JSON.stringify(params.filters)
        : typeof params.filters === "string"
          ? params.filters
          : undefined,
  };

  const response = await axiosInstance.get<SaleOrderListResponse>(API_SALE_ORDERS_GROUP.list, { params: requestParams });
  return response.data;
};

export const fetchSaleOrders = listSaleOrders;

export const fetchSaleOrderById = async (id: string): Promise<SaleOrder> => {
  const response = await axiosInstance.get<SaleOrder>(API_SALE_ORDERS_GROUP.detail(id));
  return response.data;
};

export const updateSaleOrder = async (id: string, payload: CreateSaleOrderDto): Promise<CreateSaleOrderResponse> => {
  const response = await axiosInstance.patch<CreateSaleOrderResponse>(API_SALE_ORDERS_GROUP.update(id), payload);
  return response.data;
};

export const cancelSaleOrder = async (saleOrderId: string): Promise<CancelSaleOrderResponse> => {
  const response = await axiosInstance.patch<CancelSaleOrderResponse>(API_SALE_ORDERS_GROUP.cancel(saleOrderId));
  return response.data;
};

export const confirmSaleOrderDelivery = async (saleOrderId: string): Promise<ConfirmSaleOrderDeliveryResponse> => {
  const response = await axiosInstance.patch<ConfirmSaleOrderDeliveryResponse>(API_SALE_ORDERS_GROUP.confirmDelivery(saleOrderId));
  return response.data;
};

export const listSaleOrderPayments = async (saleOrderId: string): Promise<SaleOrderPayment[]> => {
  const response = await axiosInstance.get<SaleOrderPayment[]>(API_SALE_ORDERS_GROUP.payments(saleOrderId));
  return response.data;
};

export const createSaleOrderPayment = async (
  saleOrderId: string,
  payload: CreateSaleOrderPaymentDto,
): Promise<{ paymentId: string }> => {
  const response = await axiosInstance.post<{ paymentId: string }>(API_SALE_ORDERS_GROUP.payments(saleOrderId), payload);
  return response.data;
};

export const deleteSaleOrderPayment = async (saleOrderId: string, paymentId: string): Promise<{ deleted: true }> => {
  const response = await axiosInstance.delete<{ deleted: true }>(API_SALE_ORDERS_GROUP.paymentById(saleOrderId, paymentId));
  return response.data;
};

export const getSaleOrderSearchState = async (): Promise<SaleOrderSearchStateResponse> => {
  const response = await axiosInstance.get<SaleOrderSearchStateResponse>(API_SALE_ORDERS_GROUP.searchState);
  return response.data;
};

export const saveSaleOrderSearchMetric = async (
  name: string,
  snapshot: SaleOrderSearchSnapshot,
): Promise<{ type: string; message: string }> => {
  const response = await axiosInstance.post(API_SALE_ORDERS_GROUP.saveSearchMetric, { name, snapshot });
  return response.data;
};

export const deleteSaleOrderSearchMetric = async (metricId: string): Promise<{ type: string; message: string }> => {
  const response = await axiosInstance.delete(API_SALE_ORDERS_GROUP.deleteSearchMetric(metricId));
  return response.data;
};
export const getSaleOrderPdf = async (id: string): Promise<Blob> => {
  const response = await axiosInstance.get(API_SALE_ORDERS_GROUP.saleOrderPdf(id), {
    responseType: "blob",
  });
  return response.data;
};
