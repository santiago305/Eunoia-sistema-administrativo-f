import { User } from "@/components/dashboard/types";
import { DocType, DocStatus } from "@/pages/warehouse/types/warehouse";
import { ProductType } from "./ProductTypes";

export type GetDocuments = {
  docType: DocType;
  status: DocStatus;
  warehouseId?: string;
  productType?: ProductType;
  from?: Date;
  to?: Date;
  page?: string;
  limit?: string;
};
export type DocumentInventory = {
  id:string;
  docType: DocType;
  status: DocStatus;
  serie:string;
  correlative:number;
  toWarehouse:string;
  fromWarehouse:string;
  createdBy:User;
  createdAt:string;
};

export type DocumentListResponse = {
  items: DocumentInventory[];
  total: number;
  page: number;
  limit: number;
};