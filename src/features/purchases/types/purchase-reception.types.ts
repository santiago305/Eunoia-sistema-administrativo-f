import type { PurchaseItemType } from "./purchase-classification.types";

export type PurchaseReceptionStatus = "DRAFT" | "CONFIRMED";

export type PurchaseReceptionItem = {
  receptionItemId?: string;
  purchaseItemId: string;
  stockItemId?: string;
  itemType: PurchaseItemType;
  orderedQuantity: number;
  receivedQuantity: number;
  acceptedQuantity: number;
  rejectedQuantity: number;
  affectsStock: boolean;
  stockPosted: boolean;
  serviceConfirmed: boolean;
  note?: string;
};

export type PurchaseReception = {
  receptionId?: string;
  purchaseId: string;
  warehouseId?: string;
  status: PurchaseReceptionStatus;
  receivedByUserId?: string;
  receivedAt?: string;
  note?: string;
  evidenceUrls: string[];
  inventoryDocumentId?: string;
  createdAt?: string;
  items: PurchaseReceptionItem[];
};

export type CreatePurchaseReceptionPayload = {
  purchaseId: string;
  warehouseId?: string;
  note?: string;
  evidenceUrls?: string[];
  confirmNow?: boolean;
  items: Array<{
    purchaseItemId: string;
    receivedQuantity: number;
    acceptedQuantity?: number;
    rejectedQuantity?: number;
    note?: string;
  }>;
};
