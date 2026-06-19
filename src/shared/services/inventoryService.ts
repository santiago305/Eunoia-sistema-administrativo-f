import axiosInstance from "@/shared/common/utils/axios";
import { API_INVENTORY_GROUP } from "@/shared/services/APIs";
import { API_INVENTORY_ALERT_SETTINGS_GROUP } from "@/shared/services/APIs";
import type {
  GetStockQuery,
  GetStockResponse,
  InventoryListResponse,
  ListInventoryQuery,
} from "@/features/catalog/types/inventory";
import type { ProductType } from "@/features/catalog/types/ProductTypes";
import type {
  InventorySearchSnapshot,
  InventorySearchStateResponse,
} from "@/features/catalog/types/inventorySearch";
import type { ProductCatalogProductType } from "@/features/catalog/types/product";
import type {
  InventoryAlertSetting,
  ListInventoryAlertSettingsQuery,
  UpdateInventoryAlertSettingPayload,
} from "@/features/catalog/types/inventoryAlertSettings";

export const getStock = async (params: GetStockQuery): Promise<GetStockResponse> => {
  const response = await axiosInstance.get(
    API_INVENTORY_GROUP.getStockQuery({
      warehouseId: params.warehouseId,
      itemId: params.itemId,
      stockItemId: params.stockItemId,
      locationId: params.locationId,
    })
  );
  return response.data;
};

export const listInventory = async (params: ListInventoryQuery): Promise<InventoryListResponse> => {
  const unique = (values: Array<string | undefined> | undefined) =>
    Array.from(new Set((values ?? []).map((value) => value?.trim()).filter(Boolean))) as string[];

  const mergeLists = (value?: string[] | string) => {
    if (!value) return [];
    if (Array.isArray(value)) return unique(value);
    return unique(value.split(","));
  };

  const warehouseIdsIn = unique([
    ...mergeLists((params as any).warehouseIdsIn),
    ...(params.warehouseId ? [params.warehouseId] : []),
  ]);

  const warehouseIdsNotIn = mergeLists((params as any).warehouseIdsNotIn);

  const skuIdsIn = unique([
    ...mergeLists((params as any).skuIdsIn),
    ...(params.skuId ? [params.skuId] : []),
  ]);

  const skuIdsNotIn = mergeLists((params as any).skuIdsNotIn);

  const q = params.q?.trim() || params.search?.trim() || undefined;

  const requestParams: Record<string, unknown> = {
    ...params,
    q,
    filters: params.filters,
    warehouseIdsIn: warehouseIdsIn.length ? warehouseIdsIn.join(",") : undefined,
    warehouseIdsNotIn: warehouseIdsNotIn.length ? warehouseIdsNotIn.join(",") : undefined,
    skuIdsIn: skuIdsIn.length ? skuIdsIn.join(",") : undefined,
    skuIdsNotIn: skuIdsNotIn.length ? skuIdsNotIn.join(",") : undefined,
  };

  const response = await axiosInstance.get(API_INVENTORY_GROUP.list, {
    params: requestParams,
  });
  return response.data;
};

export const getInventorySearchState = async (params: {
  productType?: ProductCatalogProductType;
}): Promise<InventorySearchStateResponse> => {
  const response = await axiosInstance.get(API_INVENTORY_GROUP.searchState, { params });
  return response.data;
};

export const saveInventorySearchMetric = async (payload: {
  name: string;
  productType?: ProductCatalogProductType;
  snapshot: InventorySearchSnapshot;
}): Promise<{ type: string; message: string }> => {
  const response = await axiosInstance.post(API_INVENTORY_GROUP.saveSearchMetric, payload);
  return response.data;
};

export const deleteInventorySearchMetric = async (params: {
  metricId: string;
  productType?: ProductCatalogProductType;
}): Promise<{ type: string; message: string }> => {
  const response = await axiosInstance.delete(API_INVENTORY_GROUP.deleteSearchMetric(params.metricId), {
    params: {
      ...(params.productType ? { productType: params.productType } : {}),
    },
  });
  return response.data;
};

export const getInventoryExportColumns = async (params: {
  productType?: ProductCatalogProductType;
  q?: string;
  filters?: string;
}): Promise<Array<{ key: string; label: string }>> => {
  const response = await axiosInstance.get(API_INVENTORY_GROUP.exportColumns, { params });
  return response.data;
};

export const exportInventoryExcel = async (payload: ListInventoryQuery & {
  columns: Array<{ key: string; label: string }>;
}): Promise<{ blob: Blob; filename: string }> => {
  const response = await axiosInstance.post(API_INVENTORY_GROUP.exportExcel, payload, {
    responseType: "blob",
  });
  const disposition = response.headers["content-disposition"] as string | undefined;
  const match = disposition?.match(/filename="?([^"]+)"?/i);
  const filename = match?.[1] ?? `inventario-${new Date().toISOString().slice(0, 10)}.xlsx`;
  return { blob: response.data as Blob, filename };
};

export const getInventoryExportPresets = async (params: {
  productType?: ProductCatalogProductType;
}): Promise<Array<{ metricId: string; name: string; snapshot: any }>> => {
  const response = await axiosInstance.get(API_INVENTORY_GROUP.exportPresets, { params });
  return response.data;
};

export const saveInventoryExportPreset = async (payload: {
  name: string;
  productType?: ProductCatalogProductType;
  columns: Array<{ key: string; label: string }>;
  useDateRange?: boolean;
}) => {
  const response = await axiosInstance.post(API_INVENTORY_GROUP.exportPresets, payload);
  return response.data;
};

export const deleteInventoryExportPreset = async (params: {
  metricId: string;
  productType?: ProductCatalogProductType;
}) => {
  const response = await axiosInstance.delete(API_INVENTORY_GROUP.deleteExportPreset(params.metricId), {
    params: {
      ...(params.productType ? { productType: params.productType } : {}),
    },
  });
  return response.data;
};

const normalizeInventoryAlertSetting = (setting: any): InventoryAlertSetting => ({
  id: setting?.id ?? null,
  stockItemId: String(setting?.stockItemId ?? ""),
  warehouseId: setting?.warehouseId ?? null,
  minStockAlertQty:
    setting?.minStockAlertQty === null || setting?.minStockAlertQty === undefined
      ? null
      : Number(setting.minStockAlertQty),
  alertThresholdDays: Number(setting?.alertThresholdDays ?? 3),
  alertEnabled: Boolean(setting?.alertEnabled ?? true),
  isDefault: Boolean(setting?.isDefault ?? false),
  createdAt: setting?.createdAt,
  updatedAt: setting?.updatedAt,
});

export const listInventoryAlertSettings = async (
  params: ListInventoryAlertSettingsQuery = {},
): Promise<InventoryAlertSetting[]> => {
  const response = await axiosInstance.get(API_INVENTORY_ALERT_SETTINGS_GROUP.list, { params });
  return Array.isArray(response.data) ? response.data.map(normalizeInventoryAlertSetting) : [];
};

export const getInventoryAlertSetting = async (
  stockItemId: string,
  params: { warehouseId?: string | null } = {},
): Promise<InventoryAlertSetting> => {
  const response = await axiosInstance.get(API_INVENTORY_ALERT_SETTINGS_GROUP.byStockItem(stockItemId), {
    params: {
      ...(params.warehouseId !== undefined ? { warehouseId: params.warehouseId } : {}),
    },
  });
  return normalizeInventoryAlertSetting(response.data);
};

export const updateInventoryAlertSetting = async (
  stockItemId: string,
  payload: UpdateInventoryAlertSettingPayload,
): Promise<InventoryAlertSetting> => {
  const response = await axiosInstance.patch(API_INVENTORY_ALERT_SETTINGS_GROUP.byStockItem(stockItemId), payload);
  return normalizeInventoryAlertSetting(response.data);
};

export type AvailableStockQuery = {
  warehouseId?: string;
  q?: string;
  isActive?: "true" | "false";
  skuId?: string;
  productType?: ProductType;
  page?: string;
  limit?: string;
};

export type AvailableStockByWarehouse = {
  warehouseId: string;
  warehouseName: string;
  onHand: number;
  reserved: number;
  available: number;
  updatedAt: string | null;
};

export type AvailableStockItem = {
  skuId: string;
  stockItemId: string;
  availabilityByWarehouse: AvailableStockByWarehouse[];
  totals: {
    onHand: number;
    reserved: number;
    available: number;
  };
};

export type AvailableStockResponse = {
  items: AvailableStockItem[];
  total: number;
};

export const listAvailableStockSkus = async (
  params: AvailableStockQuery,
): Promise<AvailableStockResponse> => {
  const response = await axiosInstance.get(API_INVENTORY_GROUP.availableStockSkus, {
    params,
  });
  return response.data;
};

export type SkuStockSnapshot = {
  warehouseId: string;
  locationId: string | null;
  onHand: number;
  reserved: number;
  available: number;
  updatedAt: string | null;
};

export type SkuStockForecastWeek = {
  week: 1 | 2 | 3 | 4;
  from: string;
  toExclusive: string;
  outQty: number;
};

export type SkuStockForecastCurrentWeek = {
  week: number;
  from: string;
  toExclusive: string;
  outQty: number;
  elapsedDays?: number;
  expectedOutQtyToDate?: number;
  deltaOutQtyToDate?: number;
  pacePct?: number;
};

export type SkuStockForecast = {
  range: { from: string; toExclusive: string };
  weeks: SkuStockForecastWeek[];
  currentWeek?: SkuStockForecastCurrentWeek;
  weightedWeekly: number;
  trendPct: number;
  forecastWeekly: number;
  forecastDaily: number;
  forecastWeeklyFromLastWeek?: number;
  stock: { onHand: number; reserved: number; available: number };
  daysOfStock: number | null;
  timeZone?: string;
};

export type SkuStockSnapshotsResponse = {
  stockItemId: string;
  sku: unknown;
  snapshots: SkuStockSnapshot[];
  forecast: SkuStockForecast;
};

export type SkuStockSnapshotsQuery = {
  warehouseId?: string;
};

export const getSkuStockSnapshots = async (
  skuId: string,
  params?: SkuStockSnapshotsQuery,
): Promise<SkuStockSnapshotsResponse> => {
  const response = await axiosInstance.get(API_INVENTORY_GROUP.skuStockSnapshots(skuId), {
    params,
  });
  return response.data;
};
