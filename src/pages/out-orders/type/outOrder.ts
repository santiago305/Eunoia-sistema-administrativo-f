import { DocType } from "@/pages/warehouse/types/warehouse"

export type CreateOutOrder = {
  docType: DocType,
  serieId?:string,
  warehouseId:string,
  direction?: Direction,
  note?:string,
  items:ItemOutOrder[]
}

export type ItemOutOrder = {
  itemId?:string,
  skuId?:string,
  quantity:number,
  unitCost?:number
}

export type AddOutOrderItemDto = ItemOutOrder;

export type OutOrderResponse = {
  type?:string,
  message?:string,
  docId?:string,
  documentId?:string,
};

export type SerieOption = {
  value:string,
  serie:string,
}
export enum Direction {
  IN = "IN",
  OUT = "OUT",
}

export type OutOrderItemRow = {
  id: string;
  itemId?: string;
  sku: string;
  productName: string;
  unitName: string;
  quantity: number;
  unitCost?: number;
};
export type SkuAttribute = { code: string; name: string; value: string };
