import axiosInstance from "@/common/utils/axios";
import { API_PRODUCTION_ORDERS_GROUP } from "@/services/APIs";
import type {
  AddProductionOrderItemDto,
  CreateProductionOrderDto,
  ListProductionOrdersQuery,
  ProductionOrder,
  ProductionOrderListResponse,
  ProductionSearchSnapshot,
  ProductionSearchStateResponse,
  UpdateProductionOrderDto,
  UpdateProductionOrderItemDto,
} from "@/pages/production/types/production";

export const createProductionOrder = async (
  payload: CreateProductionOrderDto
): Promise<ProductionOrder> => {
  const response = await axiosInstance.post(API_PRODUCTION_ORDERS_GROUP.create, payload);
  return response.data;
};

export const listProductionOrders = async (
  params: ListProductionOrdersQuery
): Promise<ProductionOrderListResponse> => {
  const requestParams = {
    ...params,
    filters:
      Array.isArray(params.filters) && params.filters.length
        ? JSON.stringify(params.filters)
        : typeof params.filters === "string"
          ? params.filters
          : undefined,
  };
  const response = await axiosInstance.get(API_PRODUCTION_ORDERS_GROUP.list, {
    params: requestParams,
  });
  return response.data;
};

export const getProductionSearchState = async (): Promise<ProductionSearchStateResponse> => {
  const response = await axiosInstance.get(API_PRODUCTION_ORDERS_GROUP.searchState);
  return response.data;
};

export const saveProductionSearchMetric = async (
  name: string,
  snapshot: ProductionSearchSnapshot,
): Promise<{ type: string; message: string }> => {
  const response = await axiosInstance.post(API_PRODUCTION_ORDERS_GROUP.saveSearchMetric, {
    name,
    snapshot,
  });
  return response.data;
};

export const deleteProductionSearchMetric = async (
  metricId: string,
): Promise<{ type: string; message: string }> => {
  const response = await axiosInstance.delete(
    API_PRODUCTION_ORDERS_GROUP.deleteSearchMetric(metricId),
  );
  return response.data;
};

export const getProductionOrder = async (id: string): Promise<ProductionOrder> => {
  const response = await axiosInstance.get(API_PRODUCTION_ORDERS_GROUP.byId(id));
  return response.data;
};

export const updateProductionOrder = async (
  id: string,
  payload: UpdateProductionOrderDto
): Promise<ProductionOrder> => {
  const response = await axiosInstance.patch(API_PRODUCTION_ORDERS_GROUP.update(id), payload);
  return response.data;
};

export const startProductionOrder = async (id: string): Promise<ProductionOrder> => {
  const response = await axiosInstance.post(API_PRODUCTION_ORDERS_GROUP.start(id));
  return response.data;
};

export const closeProductionOrder = async (id: string): Promise<ProductionOrder> => {
  const response = await axiosInstance.post(API_PRODUCTION_ORDERS_GROUP.close(id));
  return response.data;
};

export const cancelProductionOrder = async (id: string): Promise<ProductionOrder> => {
  const response = await axiosInstance.post(API_PRODUCTION_ORDERS_GROUP.cancel(id));
  return response.data;
};

export const addProductionOrderItem = async (
  productionId: string,
  payload: AddProductionOrderItemDto
): Promise<ProductionOrder> => {
  const response = await axiosInstance.post(
    API_PRODUCTION_ORDERS_GROUP.addItem(productionId),
    payload
  );
  return response.data;
};

export const updateProductionOrderItem = async (
  productionId: string,
  itemId: string,
  payload: UpdateProductionOrderItemDto
): Promise<ProductionOrder> => {
  const response = await axiosInstance.patch(
    API_PRODUCTION_ORDERS_GROUP.updateItem(productionId, itemId),
    payload
  );
  return response.data;
};

export const removeProductionOrderItem = async (
  productionId: string,
  itemId: string
): Promise<ProductionOrder> => {
  const response = await axiosInstance.delete(
    API_PRODUCTION_ORDERS_GROUP.removeItem(productionId, itemId)
  );
  return response.data;
};
