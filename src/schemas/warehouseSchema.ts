// src/schemas/warehouseSchemas.ts
import { z } from "zod";

export const createWarehouseSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  department: z.string().min(1, "El departamento es obligatorio"),
  province: z.string().min(1, "La provincia es obligatoria"),
  district: z.string().min(1, "El distrito es obligatorio"),
  address: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

export const updateWarehouseSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio").optional(),
  department: z.string().min(1, "El departamento es obligatorio").optional(),
  province: z.string().min(1, "La provincia es obligatoria").optional(),
  district: z.string().min(1, "El distrito es obligatorio").optional(),
  address: z.string().optional().nullable(),
});

export const updateWarehouseActiveSchema = z.object({
  isActive: z.boolean(),
});

export const listWarehousesQuerySchema = z.object({
  page: z.number().int().min(1).optional(),
  limit: z.number().int().min(1).max(100).optional(),
  isActive: z.enum(["true", "false"]).optional(),
  name: z.string().optional(),
  department: z.string().optional(),
  province: z.string().optional(),
  district: z.string().optional(),
  q: z.string().optional(),
});