import { z } from "zod";

export const createSupplierVariantSchema = z.object({
  supplierId: z.string().uuid(),
  variantId: z.string().uuid(),
  supplierSku: z.string().optional(),
  lastCost: z.number().min(0).optional(),
  leadTimeDays: z.number().int().min(0).optional(),
});

export const updateSupplierVariantSchema = z.object({
  supplierSku: z.string().optional(),
  lastCost: z.number().min(0).optional(),
  leadTimeDays: z.number().int().min(0).optional(),
});

export const listSupplierVariantsQuerySchema = z.object({
  page: z.number().int().min(1).optional(),
  limit: z.number().int().min(1).max(100).optional(),
  supplierId: z.string().uuid().optional(),
  variantId: z.string().uuid().optional(),
  supplierSku: z.string().optional(),
});
