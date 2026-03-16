import { z } from "zod";
import {
  addProductionOrderItemSchema,
  createProductionOrderSchema,
  listProductionOrdersQuerySchema,
  updateProductionOrderItemSchema,
  updateProductionOrderSchema,
} from "@/schemas/productionSchemas";

export type CreateProductionOrderDto = z.infer<typeof createProductionOrderSchema>;
export type UpdateProductionOrderDto = z.infer<typeof updateProductionOrderSchema>;
export type AddProductionOrderItemDto = z.infer<typeof addProductionOrderItemSchema>;
export type UpdateProductionOrderItemDto = z.infer<typeof updateProductionOrderItemSchema>;
export type ListProductionOrdersQuery = z.infer<typeof listProductionOrdersQuerySchema>;


export enum ProductionStatus {
  DRAFT = "DRAFT",
  IN_PROGRESS = "IN_PROGRESS",
  PARTIAL = "PARTIAL",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
}
export type ProductionOrderItem = {
  itemId?: string;
  finishedItemId: string;
  quantity: number;
  unitCost: number | null;
  type?:string | null;
};

export type ProductionOrder = {
  productionId?: string;
  status?: ProductionStatus;
  serieId: string;
  correlative?: number;
  reference?: string | null;
  manufactureDate: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  createdAt?: string;
  updatedAt?: string;
  items?: ProductionOrderItem[];
  fromWarehouse?: ProductionOrderWarehouse | null;
  toWarehouse?: ProductionOrderWarehouse | null;
  serie?: ProductionOrderSerie | null;
};

export type ProductionOrderWarehouse = {
  id: string;
  name: string;
  department: string;
  province: string;
  district: string;
  address: string | null;
  isActive: boolean;
  createdAt: string;
};

export type ProductionOrderSerie = {
  id: string;
  code: string;
  name: string;
  docType: string;
  warehouseId: string;
  nextNumber: number;
  padding: number;
  separator: string;
  isActive: boolean;
  createdAt: string;
};

export type ProductionOrderListResponse = {
  items: ProductionOrder[];
  total: number;
  page: number;
  limit: number;
};
