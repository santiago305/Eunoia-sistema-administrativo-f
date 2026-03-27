import { z } from "zod";
import {
  createProductSchema,
  updateProductSchema,
  updateProductActiveSchema,
  listProductsQuerySchema,
} from "@/schemas/productSchemas";
import type { ProductType } from "@/pages/catalog/types/ProductTypes";


export type CreateProductDto = z.infer<typeof createProductSchema>;
export type UpdateProductDto = z.infer<typeof updateProductSchema>;
export type UpdateProductActiveDto = z.infer<typeof updateProductActiveSchema>;
export type ListProductsQuery = z.infer<typeof listProductsQuerySchema>;

export type Product = {
  id: string;
  type:ProductType;
  name: string;
  description: string | null;
  isActive: boolean;
  barcode?: string | null;
  sku?: string | null;
  price?: number;
  cost?: number;
  baseUnitName?: string;
  baseUnitCode?: string;
  baseUnitId?: string;
  attributes?: {
    presentation: string,
    variant:string,
    color:string
  };
  createdAt: string;
  updatedAt: string;
  customSku?:string;
};

export type ProductForm = {
    name: string;
    description: string;
    isActive: boolean;
    barcode: string;
    price: string;
    cost: string;
    attribute: {
      presentation?: string,
      color?:string,
      variant?:string
    }
    attributes?: {
      presentation?: string,
      color?:string,
      variant?:string
    }
    baseUnitId: string;
    customSku?:string;
    sku?: string | null;
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


