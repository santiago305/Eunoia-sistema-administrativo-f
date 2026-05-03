import axiosInstance from "@/shared/common/utils/axios";
import { API_KARDEX_GROUP } from "@/shared/services/APIs";
import type {
  InventoryLedgerListItem,
  KardexDailyTotal,
  KardexListQuery,
  KardexTotalsQuery,
} from "@/features/catalog/types/kardex";
import type { InventoryLedgerMovementListResponse } from "@/features/catalog/types/inventoryLedgerMovements";
import type {
  InventoryLedgerSearchSnapshot,
  InventoryLedgerSearchStateResponse,
} from "@/features/catalog/types/inventoryLedgerSearch";
import type { ProductCatalogProductType } from "@/features/catalog/types/product";
import type {
} from "@/features/catalog/types/inventory";

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

export const getInventoryLedgerExportColumns = async (params: {
  from?: string;
  to?: string;
  productType?: ProductCatalogProductType;
  q?: string;
  filters?: string;
}): Promise<Array<{ key: string; label: string }>> => {
  const response = await axiosInstance.get(API_KARDEX_GROUP.exportColumns, { params });
  return response.data;
};

export const exportInventoryLedgerExcel = async (payload: {
  from?: string;
  to?: string;
  productType?: ProductCatalogProductType;
  q?: string;
  filters?: string;
  columns: Array<{ key: string; label: string }>;
}): Promise<{ blob: Blob; filename: string }> => {
  const response = await axiosInstance.post(API_KARDEX_GROUP.exportExcel, payload, {
    responseType: "blob",
  });
  const disposition = response.headers["content-disposition"] as string | undefined;
  const match = disposition?.match(/filename="?([^"]+)"?/i);
  const filename = match?.[1] ?? `movimientos-${new Date().toISOString().slice(0, 10)}.xlsx`;
  return { blob: response.data as Blob, filename };
};

export const getInventoryLedgerExportPresets = async (params: {
  productType?: ProductCatalogProductType;
}): Promise<Array<{ metricId: string; name: string; snapshot: any }>> => {
  const response = await axiosInstance.get(API_KARDEX_GROUP.exportPresets, { params });
  return response.data;
};

export const saveInventoryLedgerExportPreset = async (payload: {
  name: string;
  productType?: ProductCatalogProductType;
  columns: Array<{ key: string; label: string }>;
  useDateRange?: boolean;
}) => {
  const response = await axiosInstance.post(API_KARDEX_GROUP.exportPresets, payload);
  return response.data;
};

export const deleteInventoryLedgerExportPreset = async (params: {
  metricId: string;
  productType?: ProductCatalogProductType;
}) => {
  const response = await axiosInstance.delete(API_KARDEX_GROUP.deleteExportPreset(params.metricId), {
    params: {
      ...(params.productType ? { productType: params.productType } : {}),
    },
  });
  return response.data;
};
