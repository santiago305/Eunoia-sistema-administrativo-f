import type { Direction, IsoDateString } from "@/pages/catalog/types/kardex";
import type { ProductCatalogProductType } from "@/pages/catalog/types/product";

export type InventoryLedgerMovementListItem = {
  id: string;
  createdAt: IsoDateString;
  quantity: number;
  direction: Direction;
  warehouseId: string;
  warehouseName: string | null;
  sku: {
    id: string;
    productId: string;
    backendSku: string;
    customSku: string | null;
    name: string;
  };
  product: {
    id: string;
    name: string;
    type: ProductCatalogProductType;
    baseUnitId: string | null;
  };
  user: {
    id: string;
    name: string | null;
    email: string | null;
  } | null;
};

export type InventoryLedgerMovementListResponse = {
  items: InventoryLedgerMovementListItem[];
  total: number;
};

