import type { DocType } from "@/features/warehouse/types/warehouse";

export enum InventoryMovementDirection {
  IN = "IN",
  OUT = "OUT",
}

export type InventoryMovementItem = {
  itemId?: string;
  skuId?: string;
  quantity: number;
  unitCost?: number;
  direction?: InventoryMovementDirection;
};

export type CreateInventoryMovement = {
  docType: DocType;
  serieId?: string;
  warehouseId: string;
  direction?: InventoryMovementDirection;
  note?: string;
  items: InventoryMovementItem[];
};

export type InventoryMovementResponse = {
  type?: string;
  message?: string;
  docId?: string;
  documentId?: string;
};
