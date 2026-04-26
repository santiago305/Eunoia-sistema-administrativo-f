import { z } from "zod";
import {
  createProductSchema,
  updateProductSchema,
  updateProductActiveSchema,
  listProductsQuerySchema,
} from "@/schemas/productSchemas";
import type { ProductType } from "@/pages/catalog/types/ProductTypes";
import { RecipeDraft } from "../components/RecipeFormFields";
import { EquivalenceDraft } from "./equivalence";


export type CreateProductDto = z.infer<typeof createProductSchema>;
export type UpdateProductDto = z.infer<typeof updateProductSchema>;
export type UpdateProductActiveDto = z.infer<typeof updateProductActiveSchema>;
export type ListProductsQuery = z.infer<typeof listProductsQuerySchema>;

export type ProductCatalogProductType = "MATERIAL" | "PRODUCT";

export type ProductCatalogProduct = {
  id: string;
  name: string;
  description: string | null;
  type: ProductCatalogProductType;
  brand: string | null;
  baseUnitId: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type ProductCatalogUnit = {
  id: string;
  name: string;
  code: string;
};

export type ProductCatalogSku = {
  id: string;
  productId?: string;
  backendSku: string;
  customSku: string | null;
  name: string;
  barcode?: string | null;
  price?: number;
  cost?: number;
  isSellable?: boolean;
  isPurchasable?: boolean;
  isManufacturable?: boolean;
  isStockTracked?: boolean;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type ProductCatalogSkuAttribute = {
  code: string;
  name?: string | null;
  value: string;
};

export type ProductCatalogSkuResponse = {
  sku: ProductCatalogSku;
  attributes: ProductCatalogSkuAttribute[];
  stockItemId?: string | null;
};

export type ProductCatalogProductDetailResponse = {
  product: ProductCatalogProduct;
  baseUnit: ProductCatalogUnit | null;
  skus: ProductCatalogSkuResponse[];
};

export type Product = Omit<ProductCatalogProduct, "createdAt" | "updatedAt" | "type"> & {
  hasVariants?: boolean;
  skuCount?: number | null;
  inventoryTotal?: number | null;
  barcode?: string | null;
  sku?: string | null;
  price?: number;
  cost?: number;
  minStock?: number | null;
  baseUnitName?: string;
  baseUnitCode?: string;
  baseUnit?: string | null;
  attributes?: {
    presentation: string,
    variant:string,
    color:string
  };
  createdAt?: string;
  updatedAt?: string | null;
  customSku?: string;
  type?: ProductCatalogProductType | ProductType | string;
};

export type ProductBaseUnit = ProductCatalogUnit;

export type ProductSku = ProductCatalogSku;

export type ProductSkuAttribute = ProductCatalogSkuAttribute;

export type ProductSkuWithAttributes = ProductCatalogSkuResponse & {
  unit?: ProductBaseUnit | null;
};

export type ListSkusQuery = {
  productType?: ProductType;
  productId?: string;
  isActive?: boolean;
  q?: string;
  page?: number;
  limit?: number;
};
export type ProductCreateModalProps = {
  open: boolean;
  mode?: "create" | "edit";
  productId?: string | null;
  productType: ProductCatalogProductType;
  primaryColor?: string;
  entityLabel?: string;
  onClose: () => void;
  onSaved?: () => void;
};

export type WorkspaceTab = "details" | "equivalences" | "recipes";

export type ProductCreateForm = {
  name: string;
  description: string;
  brand: string;
  baseUnitId: string;
  isActive: boolean;
  wantsVariants: "no" | "yes";
};

export type ProductCreateDraft = {
  equivalences: EquivalenceDraft[];
  recipesBySku: Record<string, RecipeDraft>;
};

export type ListSkusResponse = {
  items: ProductSkuWithAttributes[];
  total: number;
  page?: number;
  limit?: number;
};

export type ProductDetailResponse = {
  product: Product;
  baseUnit: ProductBaseUnit | null;
  skus: ProductSkuWithAttributes[];
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
    minStock?: string;
};

export type CreateBaseProductDto = {
  name: string;
  description?: string | null;
  type: ProductCatalogProductType;
  brand?: string | null;
  baseUnitId?: string;
  isActive?: boolean;
};

export type UpdateActiveProduct = {
  isActive: boolean;
};

export type CreateProductSkuAttributeDto = {
  code: string;
  name?: string;
  value: string;
};

export type CreateProductSkuDto = {
  name: string;
  customSku?: string | null;
  barcode?: string | null;
  price?: number;
  cost?: number;
  isSellable?: boolean;
  isPurchasable?: boolean;
  isManufacturable?: boolean;
  isStockTracked?: boolean;
  isActive?: boolean;
  attributes?: CreateProductSkuAttributeDto[];
};

export type UpdateProductSkuDto = {
  name?: string;
  customSku?: string | null;
  barcode?: string | null;
  price?: number;
  cost?: number;
  isSellable?: boolean;
  isPurchasable?: boolean;
  isManufacturable?: boolean;
  isStockTracked?: boolean;
  isActive?: boolean;
  attributes?: CreateProductSkuAttributeDto[];
};

export type ProductListResponse = {
  items: Product[];
  total: number;
  page: number;
  limit: number;
};


