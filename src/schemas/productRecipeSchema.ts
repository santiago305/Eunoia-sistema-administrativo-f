import { z } from "zod";

export const createSkuRecipeSchema = z.object({
  yieldQuantity: z.number().min(0),
  notes: z.string().optional(),
  items: z
    .array(
      z.object({
        materialSkuId: z.string().uuid(),
        quantity: z.number().min(0),
        unitId: z.string().uuid(),
      }),
    )
    .min(1),
});


