import { z } from "zod";

export const listProductEquivalencesQuerySchema = z.object({
  productId: z.string().uuid(),
});

export const createProductEquivalenceSchema = z.object({
  fromUnitId: z.string().uuid(),
  toUnitId: z.string().uuid(),
  factor: z.number().min(0),
});


