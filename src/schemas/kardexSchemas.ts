import { z } from "zod";

const uuidSchema = z.string().uuid();

export const listKardexQuerySchema = z.object({
  skuId: uuidSchema,
  warehouseId: uuidSchema.optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});
