import { DocStatus, DocType } from "@/features/warehouse/types/warehouse";
import { ProductSkuWithAttributes } from "./product";

export enum InventoryDocumentProductType {
  MATERIAL = "MATERIAL",
  PRODUCT = "PRODUCT",
}

export type InventoryDocumentWarehouseRef = {
  warehouseId: string;
  name: string | null;
};

export type InventoryDocumentUserRef = {
  id: string;
  name: string | null;
  email: string | null;
};

export type InventoryDocument = {
  id: string;
  docType: DocType;
  productType: InventoryDocumentProductType | null;
  status: DocStatus;

  serieId: string | null;
  serie: string | null;
  serieCode: string | null;
  serieSeparator: string | null;
  seriePadding: number | null;
  correlative: number | null;

  fromWarehouseId: string | null;
  fromWarehouseName: string | null;
  fromWarehouse: InventoryDocumentWarehouseRef | null;

  toWarehouseId: string | null;
  toWarehouseName: string | null;
  toWarehouse: InventoryDocumentWarehouseRef | null;

  referenceId: string | null;
  referenceType: string | null;
  note: string | null;

  createdById: string | null;
  createdBy: InventoryDocumentUserRef | null;

  postedById: string | null;
  postedBy: InventoryDocumentUserRef | null;

  postedAt: string | null;
  createdAt: string;
  items: ProductSkuWithAttributes[];
};

export type GetInventoryDocumentsParams = {
  page?: number;
  limit?: number;
  from?: string | Date;
  to?: string | Date;
  warehouseId?: string;
  warehouseIds?: string[];
  warehouseIdsIn?: string[];
  warehouseIdsNotIn?: string[];
  docType?: DocType;
  productType?: InventoryDocumentProductType;
  status?: DocStatus;
  q?: string;
  filters?: string;
  includeItems?: boolean;
  createdById?: string;
  createdByIdsIn?: string[];
  createdByIdsNotIn?: string[];
};

export type InventoryDocumentListResponse = {
  items: InventoryDocument[];
  total: number;
  page: number;
  limit: number;
};
export type skuStock = {
  warehouseId:string,
  stockItemId:string,
  locationId?:string,
  onHand:number,
  reserved:number,
  available:number,
  updatedAt:string,
}

export type InventoryDocumentRow = {
  id: string;
  document: InventoryDocument;
  numero: string;
  docLabel: string;
  statusLabel: string;
  fromWarehouse: string;
  toWarehouse: string;
  createdBy: string;
  date: string;
  time?: string;
};

