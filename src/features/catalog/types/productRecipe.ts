import { z } from "zod";
import { createSkuRecipeSchema } from "@/shared/schemas/productRecipeSchema";
import type { ProductSkuWithAttributes } from "@/features/catalog/types/product";

export type CreateSkuRecipeDto = z.infer<typeof createSkuRecipeSchema>;

export type ProductCatalogRecipe = {
  id: string;
  skuId: string;
  version: number;
  yieldQuantity: number;
  notes: string | null;
  isActive: boolean;
  createdAt?: string;
};

export type ProductCatalogRecipeItem = {
  id: string;
  recipeId: string;
  materialSkuId: string;
  quantity: number;
  unitId: string;
  materialSku?: ProductSkuWithAttributes | null;
};

export type ProductCatalogRecipeResponse = {
  recipe: ProductCatalogRecipe;
  items: ProductCatalogRecipeItem[];
};

export type Recipe = ProductCatalogRecipe;
export type RecipeItem = ProductCatalogRecipeItem;
export type RecipeResponse = ProductCatalogRecipeResponse;
export type SkuRecipeResponse = ProductCatalogRecipeResponse;

export type UpdateRecipePayload = {
  yieldQuantity?: number;
  notes?: string | null;
  items?: Array<{
    materialSkuId: string;
    quantity: number;
    unitId: string;
  }>;
};

export type SuccessResponse<T> = {
  type: "success";
  message: string;
  data?: T;
};


