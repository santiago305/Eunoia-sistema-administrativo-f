import axiosInstance from "@/common/utils/axios";
import { API_PRODUCTION_ORDERS_GROUP } from "@/services/APIs";
import type {
  CreateProductionOrderDto,
  ListProductionOrdersQuery,
  ProductionOrder,
  ProductionSearchOption,
  ProductionOrderListResponse,
  ProductionSearchSnapshot,
  ProductionSearchStateResponse,
  UpdateProductionOrderDto,
} from "@/pages/production/types/production";

type ProductionOrderEnvelope = {
  type?: string;
  message?: string;
  order?: ProductionOrder;
};

type RawProductionSearchOption = {
  value: string;
  label: string;
  keywords?: string[];
};

function normalizeProductionSearchOptions(
  options?: RawProductionSearchOption[],
): ProductionSearchOption[] {
  return (options ?? []).map((item) => ({
    id: item.value,
    label: item.label,
    keywords: item.keywords,
  }));
}

const unwrapProductionOrder = (payload: ProductionOrder | ProductionOrderEnvelope): ProductionOrder => {
  if (payload && typeof payload === "object" && "order" in payload && payload.order) {
    return payload.order;
  }
  return payload as ProductionOrder;
};

export const createProductionOrder = async (
  payload: CreateProductionOrderDto
): Promise<ProductionOrder> => {
  const response = await axiosInstance.post<ProductionOrder | ProductionOrderEnvelope>(
    API_PRODUCTION_ORDERS_GROUP.create,
    payload,
  );
  return unwrapProductionOrder(response.data);
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
  return {
    ...response.data,
    catalogs: {
      statuses: normalizeProductionSearchOptions(response.data?.catalogs?.statuses),
      warehouses: normalizeProductionSearchOptions(response.data?.catalogs?.warehouses),
      products: normalizeProductionSearchOptions(response.data?.catalogs?.products),
    },
  };
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
  const response = await axiosInstance.patch<ProductionOrder | ProductionOrderEnvelope>(
    API_PRODUCTION_ORDERS_GROUP.update(id),
    payload,
  );
  return unwrapProductionOrder(response.data);
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

