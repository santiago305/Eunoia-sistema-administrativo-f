import axiosInstance from "@/common/utils/axios";
import { API_PRODUCTS_GROUP } from "./APIs";
import { listSkus } from "@/services/skuService";
import type { ProductType } from "@/pages/catalog/types/ProductTypes";
import type { ProductSkuWithAttributes } from "@/pages/catalog/types/product";
import {
  ProductListActive,
} from "@/pages/catalog/types/variant";

export type CatalogSearchSkuResult = {
  id: string;
  itemId: string;
  stockItemId?: string;
  productId?: string;
  sku?: string;
  productName: string;
  productDescription?: string;
  unitName?: string;
  unitCode?: string;
  baseUnitId?: string;
  isActive?: boolean;
  type?: ProductType;
  attributes: Record<string, string>;
  customSku?: string;
};

function mapSkuSearchResult(item: ProductSkuWithAttributes, productType?: ProductType): CatalogSearchSkuResult {
  const stockItemId = item.stockItemId ?? undefined;
  return {
    id: stockItemId ?? item.sku.id,
    itemId: stockItemId ?? item.sku.id,
    stockItemId,
    productId: item.sku.productId ?? undefined,
    sku: item.sku.backendSku ?? undefined,
    productName: item.sku.name ?? "",
    productDescription: "",
    unitName: item.unit?.name ?? (item.sku as { baseUnitName?: string }).baseUnitName,
    unitCode: item.unit?.code ?? (item.sku as { baseUnitCode?: string }).baseUnitCode,
    baseUnitId: item.unit?.id ?? (item.sku as { baseUnitId?: string }).baseUnitId,
    isActive: item.sku.isActive ?? true,
    type: productType,
    attributes: Object.fromEntries(
      (item.attributes ?? []).map((attr) => [attr.code, attr.value]),
    ),
    customSku: item.sku.customSku ?? undefined,
  };
}

export const searchProductAndVariant = async (params: {
  q: string;
  raw?: boolean;
  withRecipes?: boolean;
  productType?: ProductType;
  productId?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}): Promise<CatalogSearchSkuResult[]> => {
  const response = await listSkus({
    q: params.q,
    productType: params.productType,
    productId: params.productId,
    isActive: params.isActive,
    page: params.page,
    limit: params.limit,
  });

  return (response.items ?? []).map((item) => mapSkuSearchResult(item, params.productType));
};
export const listProduct = async (): Promise<CatalogSearchSkuResult[]> => {
  const response = await listSkus();
  return (response.items ?? []).map((item) => mapSkuSearchResult(item));
};
export const listProductPrimaActives= async (): Promise<ProductListActive[]> => {
  const res = await axiosInstance.get(API_PRODUCTS_GROUP.base, {
    params: { type: "material", isActive: true, limit: 1000 },
  });
  return res.data;
};



