import axiosInstance from "@/shared/common/utils/axios";
import { API_PRODUCT_RECIPES_GROUP } from "@/shared/services/APIs";
import type {
  CreateSkuRecipeDto,
  UpdateRecipePayload,
  SkuRecipeResponse,
  SuccessResponse,
  RecipeResponse,
} from "@/features/catalog/types/productRecipe";

export const getSkuRecipe = async (skuId: string): Promise<SkuRecipeResponse> => {
  const response = await axiosInstance.get(API_PRODUCT_RECIPES_GROUP.bySku(skuId));
  return response.data;
};

export const createSkuRecipe = async (
  skuId: string,
  payload: CreateSkuRecipeDto,
): Promise<SkuRecipeResponse> => {
  const response = await axiosInstance.post(API_PRODUCT_RECIPES_GROUP.bySku(skuId), payload);
  return response.data;
};

export const updateSkuRecipe = async (
  skuId: string,
  payload: UpdateRecipePayload,
): Promise<RecipeResponse> => {
  const response = await axiosInstance.patch(API_PRODUCT_RECIPES_GROUP.bySku(skuId), payload);
  return response.data;
};

export const deleteSkuRecipeItem = async (
  skuId: string,
  itemId: string,
): Promise<SuccessResponse<RecipeResponse>> => {
  const response = await axiosInstance.delete(API_PRODUCT_RECIPES_GROUP.deleteItem(skuId, itemId));
  return response.data;
};


