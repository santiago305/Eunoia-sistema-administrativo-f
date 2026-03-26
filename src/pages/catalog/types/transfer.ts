import { DocType } from "@/pages/warehouse/types/warehouse";

export type TransferItem = {
  stockItemId: string;
  quantity: number;
  unitCost?: number;
  fromLocationId?: string;
  toLocationId?: string;
};

export type CreateTransfer = {
  docType: DocType;
  serieId: string;
  fromWarehouseId?: string;
  toWarehouseId?: string;
  referenceId?: string;
  referenceType?: string;
  note?: string;
  items: TransferItem[];
};

export type TransferResponse = {
  id?: string;
  docId?: string;
  docType?: string;
  status?: string;
  serie?: string;
  correlative?: number;
  createdAt?: string;
  message?: string;
  type?: string;
};
