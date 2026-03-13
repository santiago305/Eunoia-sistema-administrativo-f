import { z } from "zod";

const uuidSchema = z.string().uuid();

export const addProductionOrderItemSchema = z.object({
  finishedItemId: uuidSchema,
  quantity: z.number().int().min(1),
  unitCost: z.number().int().min(0),
  type: z.string().optional()
});

export const createProductionOrderSchema = z.object({
  fromWarehouseId: uuidSchema,
  toWarehouseId: uuidSchema,
  serieId: uuidSchema,
  reference: z.string().optional(),
  manufactureDate: z.string().min(1),
  items: z.array(addProductionOrderItemSchema),
});

export const updateProductionOrderSchema = createProductionOrderSchema.partial();

export const updateProductionOrderItemSchema = z.object({
  finishedItemId: uuidSchema.optional(),
  quantity: z.number().int().min(1).optional(),
  unitCost: z.number().int().min(0).optional(),
  type: z.string().optional()
});

export const listProductionOrdersQuerySchema = z.object({
  status: z.string().optional(),
  warehouseId: uuidSchema.optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.number().int().min(1).optional(),
  limit: z.number().int().min(1).max(100).optional(),
});
