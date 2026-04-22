import { z } from "zod";
import { listKardexQuerySchema } from "@/schemas/kardexSchemas";
import type { ProductCatalogProductType } from "@/pages/catalog/types/product";

export type KardexListQuery = z.infer<typeof listKardexQuerySchema>;

export type Direction = "IN" | "OUT";

export type ReferenceType = "PURCHASE" | "PRODUCTION";

export type IsoDateString = string;

export interface InventoryLedgerUnitRef {
  id: string;
  name: string;
  code: string;
}

export interface InventoryLedgerSkuRef {
  id: string;
  productId: string;
  backendSku: string;
  customSku: string | null;
  name: string;
}

export interface InventoryLedgerProductRef {
  id: string;
  name: string;
  type: ProductCatalogProductType;
  baseUnitId: string | null;
}

export interface InventoryLedgerPurchaseReference {
  id: string;
  documentType: string | null;
  serie: string | null;
  correlative: number | null;
  status: string | null;
  dateIssue: IsoDateString | null;
  warehouseId: string | null;
  supplierId: string | null;
  supplier?: {
    id: string;
    name?: string;
    documentNumber?: string;
  }
}

export interface InventoryLedgerProductionReference {
  id: string;
  docType: string;
  serieId: string;
  correlative: number;
  status: string | null;
  reference: string | null;
  manufactureDate: IsoDateString | null;
  fromWarehouseId: string | null;
  toWarehouseId: string | null;
}

export type InventoryLedgerReference =
  | {
      type: "PURCHASE";
      id: string;
      purchase: InventoryLedgerPurchaseReference | null;
    }
  | {
      type: "PRODUCTION";
      id: string;
      production: InventoryLedgerProductionReference | null;
    };

export interface InventoryLedgerListItem {
  id: string;
  docId: string;
  referenceId: string | null;
  referenceType: ReferenceType | null;
  reference: InventoryLedgerReference | null;
  docItemId: string | null;
  serieId?:string;
  serie?: {
    id:string;
    code:string;
    name:string;
  }
  correlative?:number;
  warehouseId: string;
  skuId: string;
  direction: Direction;
  quantity: number;
  locationId: string | null;
  wasteQty: number | null;
  unitCost: number | null;
  createdAt: IsoDateString;
  createdBy?: {
    id:string,
    email:string,
  }
  postedBy?: {
    id:string,
    email:string,
  }
  sku: InventoryLedgerSkuRef;
  product: InventoryLedgerProductRef;
  baseUnit: InventoryLedgerUnitRef | null;
}

export type LedgerEntry = InventoryLedgerListItem;

export type KardexListResponse = InventoryLedgerListItem[];

export type KardexTotalsQuery = {
  warehouseId?: string;
  skuId?: string;
  locationId?: string;
  docId?: string;
  from?: string;
  to?: string;
};

export type KardexDailyTotal = {
  day: string;
  entrada: number;
  salida: number;
  balance: number;
};

export type ApiErrorResponse = {
  type: string;
  message: string;
  details?: unknown;
};
export type KardexRow = {
    id: string;
    fechaHora: string;
    tercero: string;
    documento: string;
    tipo: string;
    entrada: number;
    salida: string | number;
    saldo: number;
    original: LedgerEntry;
};
