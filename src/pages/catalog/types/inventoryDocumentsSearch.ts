import type { DataTableSearchOption, SmartSearchRule } from "@/components/table/search";
import type { DocStatus, DocType } from "@/pages/warehouse/types/warehouse";
import type { InventoryDocumentProductType } from "@/pages/catalog/types/documentInventory";

export const InventoryDocumentsSearchFields = {
  WAREHOUSE_ID: "warehouseId",
  FROM_WAREHOUSE_ID: "fromWarehouseId",
  TO_WAREHOUSE_ID: "toWarehouseId",
  CREATED_BY_ID: "createdById",
  STATUS: "status",
} as const;

export type InventoryDocumentsSearchField =
  typeof InventoryDocumentsSearchFields[keyof typeof InventoryDocumentsSearchFields];

export const InventoryDocumentsSearchOperators = {
  IN: "IN",
} as const;

export type InventoryDocumentsSearchOperator =
  typeof InventoryDocumentsSearchOperators[keyof typeof InventoryDocumentsSearchOperators];

export type InventoryDocumentsSearchRule = SmartSearchRule<
  InventoryDocumentsSearchField,
  InventoryDocumentsSearchOperator
>;

export type InventoryDocumentsSearchSnapshot = {
  q?: string;
  filters: InventoryDocumentsSearchRule[];
};

export type InventoryDocumentsRecentSearch = {
  recentId: string;
  label: string;
  snapshot: InventoryDocumentsSearchSnapshot;
  lastUsedAt: string;
};

export type InventoryDocumentsSavedMetric = {
  metricId: string;
  name: string;
  label: string;
  snapshot: InventoryDocumentsSearchSnapshot;
  updatedAt: string;
};

export type InventoryDocumentsSearchStateResponse = {
  recent: InventoryDocumentsRecentSearch[];
  saved: InventoryDocumentsSavedMetric[];
  catalogs: {
    warehouses: DataTableSearchOption[];
    users: DataTableSearchOption[];
    statuses: DataTableSearchOption[];
  };
};

export type InventoryDocumentsSearchContext = {
  docType: DocType;
  productType?: InventoryDocumentProductType;
  status?: DocStatus;
};
