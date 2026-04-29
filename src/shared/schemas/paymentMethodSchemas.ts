import { z } from "zod";

export const createPaymentMethodSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  isActive: z.boolean().optional(),
});

export const updatePaymentMethodSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio").optional(),
});

export const setPaymentMethodActiveSchema = z.object({
  isActive: z.boolean(),
});

export const createCompanyMethodSchema = z.object({
  companyId: z.string().uuid(),
  methodId: z.string().uuid(),
  number: z.string().optional(),
});

export const createSupplierMethodSchema = z.object({
  supplierId: z.string().uuid(),
  methodId: z.string().uuid(),
  number: z.string().optional(),
});

export const listPaymentMethodsQuerySchema = z.object({
  page: z.number().int().min(1).optional(),
  limit: z.number().int().min(1).max(100).optional(),
  isActive: z.enum(["true", "false"]).optional(),
  name: z.string().optional(),
});
