import { z } from "zod";
import {
  createProductEquivalenceSchema,
  listProductEquivalencesQuerySchema,
} from "@/schemas/equivalenceSchema";

export type ListProductEquivalencesQuery = z.infer<typeof listProductEquivalencesQuerySchema>;
export type CreateProductEquivalenceDto = z.infer<typeof createProductEquivalenceSchema>;

export type ProductEquivalence = {
  id: string;
  primaVariantId: string;
  fromUnitId: string;
  toUnitId: string;
  factor: number;
};

export type ListProductEquivalencesResponse = ProductEquivalence[];
