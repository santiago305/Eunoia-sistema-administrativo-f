import type { DataTableSearchOption, SmartSearchRule } from "@/shared/components/table/search";
import type { ProductCatalogProductType } from "@/features/catalog/types/product";

export const InventoryLedgerSearchFields = {
  SKU: "sku",
  WAREHOUSE_ID: "warehouseId",
  USER_ID: "userId",
  DIRECTION: "direction",
} as const;

export type InventoryLedgerSearchField =
  typeof InventoryLedgerSearchFields[keyof typeof InventoryLedgerSearchFields];

export const InventoryLedgerSearchOperators = {
  IN: "IN",
  CONTAINS: "CONTAINS",
  EQ: "EQ",
} as const;

export type InventoryLedgerSearchOperator =
  typeof InventoryLedgerSearchOperators[keyof typeof InventoryLedgerSearchOperators];

export type InventoryLedgerSearchRule = SmartSearchRule<
  InventoryLedgerSearchField,
  InventoryLedgerSearchOperator
>;

export type InventoryLedgerSearchSnapshot = {
  q?: string;
  filters: InventoryLedgerSearchRule[];
};

export type InventoryLedgerRecentSearch = {
  recentId: string;
  label: string;
  snapshot: InventoryLedgerSearchSnapshot;
  lastUsedAt: string;
};

export type InventoryLedgerSavedMetric = {
  metricId: string;
  name: string;
  label: string;
  snapshot: InventoryLedgerSearchSnapshot;
  updatedAt: string;
};

export type InventoryLedgerSearchStateResponse = {
  recent: InventoryLedgerRecentSearch[];
  saved: InventoryLedgerSavedMetric[];
  catalogs: {
    warehouses: DataTableSearchOption[];
    users: DataTableSearchOption[];
    directions: DataTableSearchOption[];
  };
};

export type InventoryLedgerSearchContext = {
  productType?: ProductCatalogProductType;
};

