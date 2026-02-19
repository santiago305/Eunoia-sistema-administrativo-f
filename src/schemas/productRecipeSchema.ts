import { z } from "zod";

export const listProductRecipesQuerySchema = z.object({
  variantId: z.string().uuid(),
});

export const createProductRecipeSchema = z.object({
  finishedVariantId: z.string().uuid(),
  primaVariantId: z.string().uuid(),
  quantity: z.number().min(0),
  waste: z.number().min(0).optional(),
});
