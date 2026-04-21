import { createWarehouseSchema, updateWarehouseSchema, updateWarehouseActiveSchema, listWarehousesQuerySchema } from "@/schemas/warehouseSchema";
import { z } from "zod";
import type {
  DataTableSearchOption,
  SmartSearchRangeValue,
  SmartSearchRuleMode,
} from "@/components/table/search";


export type CreateWarehouseDto = z.infer<typeof createWarehouseSchema>;
export type UpdateWarehouseDto = z.infer<typeof updateWarehouseSchema>;
export type UpdateWarehouseActiveDto = z.infer<typeof updateWarehouseActiveSchema>;

export const WarehouseSearchFields = {
  NAME: "name",
  DEPARTMENT: "department",
  PROVINCE: "province",
  DISTRICT: "district",
  ADDRESS: "address",
  STATUS: "status",
  CREATED_AT: "createdAt",
} as const;

export type WarehouseSearchField =
  typeof WarehouseSearchFields[keyof typeof WarehouseSearchFields];

export const WarehouseSearchOperators = {
  IN: "in",
  CONTAINS: "contains",
  EQ: "eq",
  ON: "on",
  AFTER: "after",
  BEFORE: "before",
  BETWEEN: "between",
} as const;

export type WarehouseSearchOperator =
  typeof WarehouseSearchOperators[keyof typeof WarehouseSearchOperators];

export type WarehouseSearchRule = {
  field: WarehouseSearchField;
  operator: WarehouseSearchOperator;
  mode?: SmartSearchRuleMode;
  value?: string;
  values?: string[];
  range?: SmartSearchRangeValue;
};

export type WarehouseSearchFilters = WarehouseSearchRule[];

export type WarehouseSearchSnapshot = {
  q?: string;
  filters: WarehouseSearchFilters;
};

export type WarehouseRecentSearch = {
  recentId: string;
  label: string;
  snapshot: WarehouseSearchSnapshot;
  lastUsedAt: string;
};

export type WarehouseSavedMetric = {
  metricId: string;
  name: string;
  label: string;
  snapshot: WarehouseSearchSnapshot;
  updatedAt: string;
};

export type WarehouseSearchStateResponse = {
  recent: WarehouseRecentSearch[];
  saved: WarehouseSavedMetric[];
  catalogs: {
    statuses: DataTableSearchOption[];
  };
};

export type WarehouseSearchCatalogs = {
  departments: DataTableSearchOption[];
  provinces: DataTableSearchOption[];
  districts: DataTableSearchOption[];
  statuses: DataTableSearchOption[];
};

export type ListWarehousesQuery = Omit<z.infer<typeof listWarehousesQuerySchema>, "filters"> & {
  filters?: WarehouseSearchFilters | string;
};

export type Warehouse = {
  warehouseId: string; 
  name: string;
  department: string;
  province: string;
  district: string;
  address?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string | null;
};

export type WarehouseListItem = {
  warehouseId: string;
  name: string;
  department: string;
  province: string;
  district: string;
  address?: string;
  isActive: boolean;
  createdAt: string;
};

export type ListWarehousesResponse = {
  items: WarehouseListItem[];
  total: number;
  page: number;
  limit: number;
};

export type ListActiveWarehousesParams = {
  page?: number;
  limit?: number;
  q?: string;
};

export type WarehouseSelectOption = {
  value: string;
  label: string;
  department?: string;
  province?: string;
  district?: string;
  address?: string;
};

export type WarehouseListResponse = {
  items: Warehouse[];
  total: number;
  page: number;
  limit: number;
};

export type WarehouseLocation = {
  locationId: string;
  code: string;
  description?: string;
};

export enum DocType {
  IN = 'IN',
  OUT = 'OUT',
  TRANSFER = 'TRANSFER',
  ADJUSTMENT = 'ADJUSTMENT',
  PRODUCTION = 'PRODUCTION'
}
export enum DocStatus {
  DRAFT = 'DRAFT',
  POSTED = 'POSTED',
  CANCELLED = 'CANCELLED',
}

export type WarehouseLocationsResponse = {
  locations: WarehouseLocation[];
};

export type WarehouseOption = { warehouseId: string; name: string };

export type WarehouseStockItem = {
  skuId: string;
  skuName: string;
  productName: string;
  onHand: number;
  locationCodes: string[];
};

export type WarehouseStockResponse = {
  warehouseId: string;
  warehouseName: string;
  totalSkus: number;
  totalOnHand: number;
  items: WarehouseStockItem[];
};


