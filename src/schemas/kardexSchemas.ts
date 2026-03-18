import { z } from "zod";

const uuidSchema = z.string().uuid();

export const listKardexQuerySchema = z.object({
  warehouseId: uuidSchema.optional(),
  stockItemId: uuidSchema.optional(),
  locationId: uuidSchema.optional(),
  docId: uuidSchema.optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.number().int().min(1).optional(),
  limit: z.number().int().min(1).max(200).optional(),
});
