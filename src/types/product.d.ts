import { z } from "zod";
import {
  createProductSchema,
  updateProductSchema,
  updateProductActiveSchema,
  listProductsQuerySchema,
} from "@/schemas/productSchemas";

export type CreateProductDto = z.infer<typeof createProductSchema>;
export type UpdateProductDto = z.infer<typeof updateProductSchema>;
export type UpdateProductActiveDto = z.infer<typeof updateProductActiveSchema>;
export type ListProductsQuery = z.infer<typeof listProductsQuerySchema>;

export type Product = {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ProductListResponse = {
  items: Product[];
  total: number;
  page: number;
  limit: number;
};

export type ProductVariant = Record<string, unknown>;

export type ProductWithVariantsResponse = {
  product: Product;
  variants: ProductVariant[];
} | null;
