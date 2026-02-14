import { z } from "zod";

export const listVariantsQuerySchema = z.object({
  page: z.number().int().min(1).optional(),
  limit: z.number().int().min(1).max(100).optional(),
  isActive: z.enum(["true", "false"]).optional(),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  productName: z.string().optional(),
  productDescription: z.string().optional(),
  q: z.string().optional(),
});

const productVariantAttributesSchema = z.record(z.string());

export const createVariantSchema = z.object({
  productId: z.string().uuid(),
  barcode: z.string().optional(),
  attributes: productVariantAttributesSchema.optional(),
  price: z.number().min(0),
  cost: z.number().min(0),
  isActive: z.boolean().optional(),
});

export const updateVariantSchema = z.object({
  barcode: z.string().nullable().optional(),
  attributes: productVariantAttributesSchema.optional(),
  price: z.number().min(0).optional(),
  cost: z.number().min(0).optional(),
});

export const setVariantActiveSchema = z.object({
  isActive: z.boolean(),
});
