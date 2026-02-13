import axiosInstance from "@/common/utils/axios";
import { API_PRODUCTS_GROUP } from "@/services/APIs";
import type {
  CreateProductDto,
  UpdateProductDto,
  UpdateProductActiveDto,
  ListProductsQuery,
  ProductListResponse,
  Product,
  ProductVariant,
  ProductWithVariantsResponse,
} from "@/types/product";

export const createProduct = async (payload: CreateProductDto): Promise<Product> => {
  const response = await axiosInstance.post(API_PRODUCTS_GROUP.create, payload);
  return response.data;
};

export const updateProduct = async (id: string, payload: UpdateProductDto): Promise<Product> => {
  const response = await axiosInstance.patch(API_PRODUCTS_GROUP.update(id), payload);
  return response.data;
};

export const updateProductActive = async (
  id: string,
  payload: UpdateProductActiveDto
): Promise<{ ok: boolean }> => {
  const response = await axiosInstance.patch(API_PRODUCTS_GROUP.updateActive(id), payload);
  return response.data;
};

export const listProducts = async (params: ListProductsQuery): Promise<ProductListResponse> => {
  const response = await axiosInstance.get(API_PRODUCTS_GROUP.list, { params });
  return response.data;
};

export const getProductVariants = async (id: string): Promise<ProductVariant[]> => {
  const response = await axiosInstance.get(API_PRODUCTS_GROUP.variants(id));
  return response.data;
};

export const getProductWithVariants = async (id: string): Promise<ProductWithVariantsResponse> => {
  const response = await axiosInstance.get(API_PRODUCTS_GROUP.withVariants(id));
  return response.data;
};
