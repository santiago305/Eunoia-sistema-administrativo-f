import {  DocType } from "@/features/warehouse/types/warehouse";

export type AdjustmentItem = {
  skuId: string;
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
  docType?: DocType;
  serieId: string;
  warehouseId?: string;
  referenceId?: string;
  referenceType?: string;
  note?: string;
  items: AdjustmentItem[];
};


export type AdjustmentResponse = {
  data?: {
    documentId:string
  };
  message?: string;
  type?: string;
};

