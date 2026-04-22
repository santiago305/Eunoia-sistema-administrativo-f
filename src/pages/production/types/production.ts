import { z } from "zod";
import type {
  DataTableSearchOption,
  SmartSearchRangeValue,
  SmartSearchRuleMode,
} from "@/components/table/search";
import {
  addProductionOrderItemSchema,
  createProductionOrderSchema,
  listProductionOrdersQuerySchema,
  updateProductionOrderSchema,
} from "@/schemas/productionSchemas";

export type CreateProductionOrderDto = z.infer<typeof createProductionOrderSchema>;
export type UpdateProductionOrderDto = z.infer<typeof updateProductionOrderSchema>;
export type AddProductionOrderItemDto = z.infer<typeof addProductionOrderItemSchema>;
export type ListProductionOrdersQuery = Omit<z.infer<typeof listProductionOrdersQuerySchema>, "filters"> & {
  q?: string;
  filters?: ProductionSearchFilters | string;
};

export const ProductionSearchFields = {
  MANUFACTURE_DATE: "manufactureDate",
  NUMBER: "number",
  REFERENCE: "reference",
  FROM_WAREHOUSE_ID: "fromWarehouseId",
  TO_WAREHOUSE_ID: "toWarehouseId",
  STATUS: "status",
  SKU_ID: "skuId",
} as const;

export type ProductionSearchField =
  typeof ProductionSearchFields[keyof typeof ProductionSearchFields];

export const ProductionSearchOperators = {
  IN: "in",
  CONTAINS: "contains",
  EQ: "eq",
  ON: "on",
  AFTER: "after",
  BEFORE: "before",
  BETWEEN: "between",
} as const;

export type ProductionSearchOperator =
  typeof ProductionSearchOperators[keyof typeof ProductionSearchOperators];

export type ProductionSearchRule = {
  field: ProductionSearchField;
  operator: ProductionSearchOperator;
  mode?: SmartSearchRuleMode;
  value?: string;
  values?: string[];
  range?: SmartSearchRangeValue;
};

export type ProductionSearchFilters = ProductionSearchRule[];

export type ProductionSearchSnapshot = {
  q?: string;
  filters: ProductionSearchFilters;
};

export type ProductionSearchOption = DataTableSearchOption;

export type ProductionRecentSearch = {
  recentId: string;
  label: string;
  snapshot: ProductionSearchSnapshot;
  lastUsedAt: string;
};

export type ProductionSavedMetric = {
  metricId: string;
  name: string;
  label: string;
  snapshot: ProductionSearchSnapshot;
  updatedAt: string;
};

export type ProductionSearchStateResponse = {
  recent: ProductionRecentSearch[];
  saved: ProductionSavedMetric[];
  catalogs: {
    warehouses: ProductionSearchOption[];
    statuses: ProductionSearchOption[];
    products: ProductionSearchOption[];
  };
};


export enum ProductionStatus {
  DRAFT = "DRAFT",
  IN_PROGRESS = "IN_PROGRESS",
  PARTIAL = "PARTIAL",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
}

export type ProductionOrderItem = {
  itemId?: string;
  finishedItemId: string;
  finishedItemType?: "PRODUCT" | "VARIANT" | null;
  finishedItem?: {
    type?: string | null;
    productId?: string | null;
    variantId?: string | null;
    product?: {
      id: string;
      name?: string | null;
      description?: string | null;
      baseUnitId?: string | null;
      baseUnitName?: string | null;
      baseUnitCode?: string | null;
      sku?: string | null;
      barcode?: string | null;
      price?: number | null;
      cost?: number | null;
      attributes?: Record<string, unknown> | null;
      isActive?: boolean | null;
      type?: string | null;
      createdAt?: string;
      updatedAt?: string;
    } | null;
    variant?: {
      id: string;
      productId?: string | null;
      productName?: string | null;
      productDescription?: string | null;
      baseUnitId?: string | null;
      unitCode?: string | null;
      unitName?: string | null;
      sku?: string | null;
      barcode?: string | null;
      attributes?: Record<string, unknown> | null;
      price?: number | null;
      cost?: number | null;
      isActive?: boolean | null;
      createdAt?: string;
      updatedAt?: string;
    } | null;
  } | null;
  quantity: number;
  unitCost: number | null;
  type?:string | null;
};

export type ProductionOrder = {
  productionId?: string;
  status?: ProductionStatus;
  serieId: string;
  correlative?: number;
  reference?: string | null;
  manufactureDate: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  createdAt?: string;
  updatedAt?: string;
  items?: ProductionOrderItem[];
  fromWarehouse?: ProductionOrderWarehouse | null;
  toWarehouse?: ProductionOrderWarehouse | null;
  serie?: ProductionOrderSerie | null;
};

export type ProductionOrderWarehouse = {
  id: string;
  name: string;
  department: string;
  province: string;
  district: string;
  address: string | null;
  isActive: boolean;
  createdAt: string;
};

export type ProductionOrderSerie = {
  id: string;
  code: string;
  name: string;
};

export type ProductionOrderListResponse = {
  items: ProductionOrder[];
  total: number;
  page: number;
  limit: number;
};
