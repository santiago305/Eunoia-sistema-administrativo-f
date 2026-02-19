import { z } from "zod";
import {
  createProductRecipeSchema,
  listProductRecipesQuerySchema,
} from "@/schemas/productRecipeSchema";

export type ListProductRecipesQuery = z.infer<typeof listProductRecipesQuerySchema>;
export type CreateProductRecipeDto = z.infer<typeof createProductRecipeSchema>;

export type ProductRecipe = {
  id: string;
  finishedVariantId: string;
  primaVariantId: string;
  quantity: number;
  waste?: number | null;
};

export type ListProductRecipesResponse = ProductRecipe[];
