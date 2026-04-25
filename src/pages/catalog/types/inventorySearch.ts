import type { DataTableSearchOption, SmartSearchRule } from "@/components/table/search";
import type { ProductCatalogProductType } from "@/pages/catalog/types/product";

export const InventorySearchFields = {
  SKU: "sku",
  WAREHOUSE: "warehouse",
  ON_HAND: "onHand",
  RESERVED: "reserved",
  AVAILABLE: "available",
} as const;

export type InventorySearchField =
  typeof InventorySearchFields[keyof typeof InventorySearchFields];

export const InventorySearchOperators = {
  IN: "IN",
  CONTAINS: "CONTAINS",
  EQ: "EQ",
  GT: "GT",
  GTE: "GTE",
  LT: "LT",
  LTE: "LTE",
} as const;

export type InventorySearchOperator =
  typeof InventorySearchOperators[keyof typeof InventorySearchOperators];

export type InventorySearchRule = SmartSearchRule<
  InventorySearchField,
  InventorySearchOperator
>;

export type InventorySearchSnapshot = {
  q?: string;
  filters: InventorySearchRule[];
};

export type InventoryRecentSearch = {
  recentId: string;
  label: string;
  snapshot: InventorySearchSnapshot;
  lastUsedAt: string;
};

export type InventorySavedMetric = {
  metricId: string;
  name: string;
  label: string;
  snapshot: InventorySearchSnapshot;
  updatedAt: string;
};

export type InventorySearchStateResponse = {
  recent: InventoryRecentSearch[];
  saved: InventorySavedMetric[];
  catalogs: {
    warehouses: DataTableSearchOption[];
  };
};

export type InventorySearchContext = {
  productType?: ProductCatalogProductType;
};
