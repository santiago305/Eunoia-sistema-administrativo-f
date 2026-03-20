import { DocType } from "@/pages/warehouse/types/warehouse"

export type CreateOutOrder = {
  docType: DocType,
  serieId:string,
  fromWarehouseId:string,
  note?:string,
  items:ItemOutOrder[]
}

export type ItemOutOrder = {
  itemId:string,
  quantity:number,
  unitCost?:number
}

export type AddOutOrderItemDto = ItemOutOrder;

export type OutOrderResponse = {
  type:string,
  message:string,
  docId:string
};

export type SerieOption = {
  value:string,
  serie:string,
}
