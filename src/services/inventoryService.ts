import axiosInstance from "@/common/utils/axios";
import { API_INVENTORY_GROUP } from "@/services/APIs";
import type {
  AvailabilityQuery,
  AvailabilityResponse,
  GetStockQuery,
  GetStockResponse,
  InventoryListResponse,
  ListInventoryQuery,
} from "@/pages/catalog/types/inventory";
import type { ProductType } from "@/pages/catalog/types/ProductTypes";

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
  const response = await axiosInstance.get(API_INVENTORY_GROUP.list, { params });
  return response.data;
};

export const getAvailability = async (params: AvailabilityQuery): Promise<AvailabilityResponse> => {
  const response = await axiosInstance.get(API_INVENTORY_GROUP.availability, { params });
  return response.data;
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
