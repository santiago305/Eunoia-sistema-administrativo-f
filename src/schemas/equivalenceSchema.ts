import { z } from "zod";

export const listProductEquivalencesQuerySchema = z.object({
  variantId: z.string().uuid(),
});

export const createProductEquivalenceSchema = z.object({
  primaVariantId: z.string().uuid(),
  fromUnitId: z.string().uuid(),
  toUnitId: z.string().uuid(),
  factor: z.number().min(0),
});
