import { z } from "zod";

export const createProductSchema = z.object({
  type: z.string().min(1, "El tipo es obligatorio"),
  name: z.string().min(1, "El nombre es obligatorio"),
  description: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

export const updateProductSchema = z.object({
  type: z.string().optional(),
  name: z.string().min(1, "El nombre es obligatorio").optional(),
  description: z.string().optional().nullable(),
});

export const updateProductActiveSchema = z.object({
  isActive: z.boolean(),
});

export const listProductsQuerySchema = z.object({
  page: z.number().int().min(1).optional(),
  limit: z.number().int().min(1).max(100).optional(),
  isActive: z.enum(["true", "false"]).optional(),
  name: z.string().optional(),
  description: z.string().optional(),
  type: z.string().optional(),
  q: z.string().optional(),
});
