import axiosInstance from "@/common/utils/axios";
import { API_PRODUCT_RECIPES_GROUP } from "@/services/APIs";
import type {
  CreateProductRecipeDto,
  ListProductRecipesQuery,
  ListProductRecipesResponse,
  ProductRecipe,
} from "@/types/productRecipe";

export const listProductRecipes = async (
  params: ListProductRecipesQuery
): Promise<ListProductRecipesResponse> => {
  const response = await axiosInstance.get(API_PRODUCT_RECIPES_GROUP.list, { params });
  return response.data;
};

export const createProductRecipe = async (
  payload: CreateProductRecipeDto
): Promise<ProductRecipe> => {
  const response = await axiosInstance.post(API_PRODUCT_RECIPES_GROUP.create, payload);
  return response.data;
};

export const deleteProductRecipe = async (id: string): Promise<void> => {
  await axiosInstance.delete(API_PRODUCT_RECIPES_GROUP.delete(id));
};
