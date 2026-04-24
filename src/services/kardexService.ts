import axiosInstance from "@/common/utils/axios";
import { API_KARDEX_GROUP } from "@/services/APIs";
import type {
  InventoryLedgerListItem,
  KardexDailyTotal,
  KardexListQuery,
  KardexTotalsQuery,
} from "@/pages/catalog/types/kardex";
import type { InventoryLedgerMovementListResponse } from "@/pages/catalog/types/inventoryLedgerMovements";
import type {
  InventoryLedgerSearchSnapshot,
  InventoryLedgerSearchStateResponse,
} from "@/pages/catalog/types/inventoryLedgerSearch";
import type { ProductCatalogProductType } from "@/pages/catalog/types/product";
import type {
} from "@/pages/catalog/types/inventory";

export const getInventoryLedgerBySku = async (
  params: KardexListQuery,
): Promise<InventoryLedgerListItem[]> => {
  const response = await axiosInstance.get(API_KARDEX_GROUP.list, { params });
  return response.data;
};

export const getDailyTotals = async (params: KardexTotalsQuery): Promise<KardexDailyTotal[]> => {
  const response = await axiosInstance.get(API_KARDEX_GROUP.totals, { params });
  return response.data;
};

export const getInventoryLedgerMovements = async (params: {
  page: number;
  limit: number;
  from?: string;
  to?: string;
  productType?: ProductCatalogProductType;
  q?: string;
  filters?: string;
}): Promise<InventoryLedgerMovementListResponse> => {
  const response = await axiosInstance.get(API_KARDEX_GROUP.movements, { params });
  return response.data;
};

export const getInventoryLedgerSearchState = async (params: {
  productType?: ProductCatalogProductType;
}): Promise<InventoryLedgerSearchStateResponse> => {
  const response = await axiosInstance.get(API_KARDEX_GROUP.searchState, { params });
  return response.data;
};

export const saveInventoryLedgerSearchMetric = async (payload: {
  name: string;
  productType?: ProductCatalogProductType;
  snapshot: InventoryLedgerSearchSnapshot;
}): Promise<{ type: string; message: string }> => {
  const response = await axiosInstance.post(API_KARDEX_GROUP.saveSearchMetric, payload);
  return response.data;
};

export const deleteInventoryLedgerSearchMetric = async (params: {
  metricId: string;
  productType?: ProductCatalogProductType;
}): Promise<{ type: string; message: string }> => {
  const response = await axiosInstance.delete(API_KARDEX_GROUP.deleteSearchMetric(params.metricId), {
    params: {
      ...(params.productType ? { productType: params.productType } : {}),
    },
  });
  return response.data;
};
