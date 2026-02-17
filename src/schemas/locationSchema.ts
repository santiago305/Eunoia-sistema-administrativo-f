import { z } from "zod";

export const createLocationSchema = z.object({
  warehouseId: z.string().uuid("warehouseId inválido"),
  code: z.string().min(1, "El código es obligatorio"),
  description: z.string().optional().nullable(),
});

export const updateLocationSchema = z.object({
  warehouseId: z.string().uuid("warehouseId inválido").optional(),
  code: z.string().min(1, "El código es obligatorio").optional(),
  description: z.string().optional().nullable(),
});

export const updateLocationActiveSchema = z.object({
  isActive: z.boolean(),
});

export const listLocationsQuerySchema = z.object({
  page: z.number().int().min(1).optional(),
  limit: z.number().int().min(1).max(100).optional(),
  isActive: z.enum(["true", "false"]).optional(),
  q: z.string().optional(),
  warehouseId: z.string().uuid().optional(),
  code: z.string().optional(),
  description: z.string().optional(),
});