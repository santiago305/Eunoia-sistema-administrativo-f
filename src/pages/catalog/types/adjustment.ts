import {  DocType } from "@/pages/warehouse/types/warehouse";

export type AdjustmentItem = {
  stockItemId: string;
  quantity: number;
  unitCost?: number;
  fromLocationId?: string;
  toLocationId?: string;
  adjustmentType?:string;
};

export type AdjustmentItemRow = AdjustmentItem & {
  rowIndex: number;
  sku?: string;
  productName?: string;
  unitName?: string;
  customSku?: string;
  attributes?: {
    presentation?: string;
    variant?: string;
    color?: string;
  };
};

export type CreateAdjustment = {
  docType: DocType;
  serieId: string;
  fromWarehouseId?: string;
  referenceId?: string;
  referenceType?: string;
  note?: string;
  items: AdjustmentItem[];
};


export type AdjustmentResponse = {
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

