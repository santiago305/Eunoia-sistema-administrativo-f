import { z } from "zod";
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

export type Variant = {
  id: string;
  productId: string;
  sku: string;
  barcode?: string | null;
  attributes?: Record<string, string>;
  price: number;
  cost: number;
  baseUnitId:string;
  isActive: boolean;
  createdAt?: string;
  productName?: string;
  productDescription?: string;
  unitCode:string;
  unitName:string;
};
export type ListVariantsResponse = {
  items: Variant[];
  total: number;
  page: number;
  limit: number;
};

export type CreateVariantResponse = {
  message: string;
  type: string;
};
