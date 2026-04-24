import { z } from "zod";
import type { ProductType } from "@/pages/catalog/types/ProductTypes";
import {
  createVariantSchema,
  listVariantsQuerySchema,
  setVariantActiveSchema,
  updateVariantSchema,
} from "@/schemas/variantSchemas";

export type ListVariantsQuery = z.infer<typeof listVariantsQuerySchema>;
export type CreateVariantDto = z.infer<typeof createVariantSchema>;
export type UpdateVariantDto = z.infer<typeof updateVariantSchema>;
export type UpdateVariantActiveDto = z.infer<typeof setVariantActiveSchema>;

export type VariantAttributes = Record<string, string>;

export type VariantUnit = {
  id: string;
  name: string;
  code?: string | null;
};

export type Variant = {
  id: string;
  productId: string;
  productName?: string | null;
  productDescription?: string | null;
  baseUnitId?: string | null;
  unitName?: string | null;
  unitCode?: string | null;
  sku?: string | null;
  barcode?: string | null;
  price?: number | null;
  cost?: number | null;
  minStock?: number | null;
  customSku?: string | null;
  isActive?: boolean;
  attributes?: VariantAttributes;
  createdAt?: string;
  updatedAt?: string;
};

export type PrimaVariant = {
  id: string;
  sku?: string;
  productName: string;
  productDescription?: string;
  unitName?: string;
  unitCode?: string;
  baseUnitId?: string;
  unit?: VariantUnit | null;
  isActive?: boolean;
  type?: ProductType;
  attributes?: VariantAttributes;
  customSku?: string;
};

export type ProductListActive = {
  id: string;
  name: string;
  sku?: string | null;
  isActive?: boolean;
  type?: ProductType | string | null;
};

export type ListVariantsResponse = {
  items: Variant[];
  total: number;
  page?: number;
  limit?: number;
};

export type CreateVariantResponse = Variant & {
  message?: string;
};
