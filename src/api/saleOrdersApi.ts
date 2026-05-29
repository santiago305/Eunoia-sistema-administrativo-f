import axiosInstance from "@/shared/common/utils/axios";
import { API_SALE_ORDERS_GROUP } from "@/shared/services/APIs";
import type {
  SaleOrderListResponse,
  SaleOrderSearchSnapshot,
  SaleOrderSearchStateResponse,
} from "@/features/sale-orders/types/saleOrder";

export function serializeFilters(filters: unknown[] | undefined) {
  if (!filters?.length) return undefined;
  return JSON.stringify(filters);
}

export function buildQueryString(params: {
  q?: string;
  page?: number;
  limit?: number;
  filters?: unknown[] | string;
}) {
  const search = new URLSearchParams();
  if (params.q?.trim()) search.set("q", params.q.trim());
  if (params.page) search.set("page", String(params.page));
  if (params.limit) search.set("limit", String(params.limit));

  const filters =
    typeof params.filters === "string" ? params.filters : serializeFilters(params.filters);
  if (filters) search.set("filters", filters);

  const query = search.toString();
  return query ? `?${query}` : "";
}

export const saleOrdersApi = {
  async listSaleOrders(params: {
    q?: string;
    page?: number;
    limit?: number;
    filters?: unknown[] | string;
  }): Promise<SaleOrderListResponse> {
    const response = await axiosInstance.get<SaleOrderListResponse>(API_SALE_ORDERS_GROUP.list, {
      params: {
        ...params,
        filters:
          typeof params.filters === "string" ? params.filters : serializeFilters(params.filters),
      },
    });
    return response.data;
  },

  async getSaleOrdersSearchState(): Promise<SaleOrderSearchStateResponse> {
    const response = await axiosInstance.get<SaleOrderSearchStateResponse>(API_SALE_ORDERS_GROUP.searchState);
    return response.data;
  },

  async saveSaleOrdersSearchMetric(payload: { name: string; snapshot: SaleOrderSearchSnapshot }): Promise<{ type: string; message: string; metric?: unknown }> {
    const response = await axiosInstance.post(API_SALE_ORDERS_GROUP.saveSearchMetric, payload);
    return response.data;
  },

  async deleteSaleOrdersSearchMetric(metricId: string): Promise<{ type: string; message: string }> {
    const response = await axiosInstance.delete(API_SALE_ORDERS_GROUP.deleteSearchMetric(metricId));
    return response.data;
  },
};

