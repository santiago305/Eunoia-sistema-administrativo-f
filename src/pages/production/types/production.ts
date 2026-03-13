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

export type ProductionStatus = "DRAFT" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

export type ProductionOrderItem = {
  itemId?: string;
  finishedItemId: string;
  quantity: number;
  unitCost: number | null;
  type?:string | null;
};

export type ProductionOrder = {
  productionId?: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  serieId: string;
  reference?: string | null;
  manufactureDate: string;
  status?: ProductionStatus;
  createdAt?: string;
  updatedAt?: string;
  items?: ProductionOrderItem[];
};

export type ProductionOrderListResponse = {
  items: ProductionOrder[];
  total: number;
  page: number;
  limit: number;
};
