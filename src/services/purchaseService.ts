import axiosInstance from "@/common/utils/axios";
import { API_PURCHASE_GROUP } from "@/services/APIs";
import type {
  CreatePurchaseOrderDto,
  ListPurchaseOrdersQuery,
  PurchaseOrder,
  PurchaseOrderItemsResponse,
  PurchaseOrderListResponse,
  UpdatePurchaseOrderActiveDto,
  UpdatePurchaseOrderDto,
} from "@/types/purchase";

export const createPurchaseOrder = async (
  payload: CreatePurchaseOrderDto
): Promise<PurchaseOrder> => {
  const response = await axiosInstance.post(API_PURCHASE_GROUP.create, payload);
  return response.data;
};

export const listPurchaseOrders = async (
  params: ListPurchaseOrdersQuery
): Promise<PurchaseOrderListResponse> => {
  const response = await axiosInstance.get(API_PURCHASE_GROUP.list, { params });
  return response.data;
};

export const updatePurchaseOrder = async (
  id: string,
  payload: UpdatePurchaseOrderDto
): Promise<PurchaseOrder> => {
  const response = await axiosInstance.patch(API_PURCHASE_GROUP.update(id), payload);
  return response.data;
};

export const setPurchaseOrderActive = async (
  id: string,
  payload: UpdatePurchaseOrderActiveDto
): Promise<{ ok: boolean }> => {
  const response = await axiosInstance.patch(API_PURCHASE_GROUP.setActive(id), payload);
  return response.data;
};

export const listPurchaseOrderItems = async (id: string): Promise<PurchaseOrderItemsResponse> => {
  const response = await axiosInstance.get(API_PURCHASE_GROUP.listItems(id));
  return response.data;
};

export const removePurchaseOrderItem = async (
  id: string,
  itemId: string
): Promise<{ ok: boolean }> => {
  const response = await axiosInstance.delete(API_PURCHASE_GROUP.removeItem(id, itemId));
  return response.data;
};
