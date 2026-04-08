import { z } from "zod";

export const listProductRecipesQuerySchema = z.object({
  finishedType: z.enum(["PRODUCT", "VARIANT"]),
  finishedItemId: z.string().uuid(),
});

export const createProductRecipeSchema = z.object({
  finishedType: z.enum(["PRODUCT", "VARIANT"]),
  finishedItemId: z.string().uuid(),
  primaVariantId: z.string().uuid(),
  quantity: z.number().min(0),
  waste: z.number().min(0).optional(),
});


