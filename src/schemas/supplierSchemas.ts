import { z } from "zod";

export const createSupplierSchema = z.object({
  documentType: z.string().min(1, "El tipo de documento es obligatorio"),
  documentNumber: z.string().min(1, "El número de documento es obligatorio"),
  name: z.string().optional(),
  lastName: z.string().optional(),
  tradeName: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Correo inválido").optional(),
  note: z.string().optional(),
  leadTimeDays: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

export const updateSupplierSchema = z.object({
  documentType: z.string().min(1, "El tipo de documento es obligatorio").optional(),
  documentNumber: z.string().min(1, "El número de documento es obligatorio").optional(),
  name: z.string().optional(),
  lastName: z.string().optional(),
  tradeName: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Correo inválido").optional(),
  note: z.string().optional(),
  leadTimeDays: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

export const updateSupplierActiveSchema = z.object({
  isActive: z.boolean(),
});

export const listSuppliersQuerySchema = z.object({
  page: z.number().int().min(1).optional(),
  limit: z.number().int().min(1).max(100).optional(),
  isActive: z.enum(["true", "false"]).optional(),
  documentType: z.string().optional(),
  documentNumber: z.string().optional(),
  name: z.string().optional(),
  lastName: z.string().optional(),
  tradeName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  q: z.string().optional(),
});
