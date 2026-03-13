import { z } from "zod";

export const documentSeriesQuerySchema = z.object({
  warehouseId: z.string().uuid("warehouseId inválido"),
  docType: z.string().optional(),
  isActive: z.boolean().optional(),
});
