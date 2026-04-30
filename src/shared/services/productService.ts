import axiosInstance from "@/shared/common/utils/axios";
import { API_PRODUCTS_GROUP, API_SKUS_GROUP } from "@/shared/services/APIs";
import type {
  CreateProductDto,
  CreateBaseProductDto,
  CreateProductSkuDto,
  UpdateProductDto,
  UpdateProductSkuDto,
  UpdateProductActiveDto,
  ListProductsQuery,
  ProductListResponse,
  Product,
  ProductBaseUnit,
  ProductCatalogProduct,
  ProductCatalogProductDetailResponse,
  ProductCatalogSkuResponse,
  ProductDetailResponse,
  ProductInventoryDetail,
} from "@/features/catalog/types/product";
import { ProductTypes } from "@/features/catalog/types/ProductTypes";
import type { ProductSearchStateResponse } from "@/features/catalog/types/productSearch";
import type { ProductSearchSnapshot } from "@/features/catalog/utils/productSmartSearch";

export const createProduct = async (payload: CreateProductDto): Promise<Product> => {
  const response = await axiosInstance.post(API_PRODUCTS_GROUP.create, payload);
  return response.data;
};

export const createBaseProduct = async (
  payload: CreateBaseProductDto,
): Promise<ProductCatalogProduct> => {
  const response = await axiosInstance.post(API_PRODUCTS_GROUP.createBase, payload);
  return response.data;
};

export const createProductSku = async (
  productId: string,
  payload: CreateProductSkuDto,
): Promise<ProductCatalogSkuResponse> => {
  const response = await axiosInstance.post(API_PRODUCTS_GROUP.createSku(productId), payload);
  return response.data;
};

export const updateProductSku = async (
  skuId: string,
  payload: UpdateProductSkuDto,
): Promise<ProductCatalogSkuResponse> => {
  const response = await axiosInstance.patch(API_SKUS_GROUP.update(skuId), payload);
  return response.data;
};

export const getProductInventoryDetail = async (
  id: string,
  type: string,
  warehouseId?: string,
): Promise<ProductInventoryDetail> => {
  const response = await axiosInstance.get<ProductInventoryDetail>(`/products/${id}/detail`, {
    params: { type, warehouseId },
  });
  return response.data;
};

const attachBaseUnit = (product: Product) => ({
  ...product,
  baseUnitId: product.baseUnitId ?? null,
  baseUnitName: product.baseUnitName ?? (product.baseUnit as string),
});

const normalizeProductList = (response: ProductListResponse): ProductListResponse => ({
  ...response,
  items: (response.items ?? []).map((item) =>
    attachBaseUnit(item as Product & { baseUnit?: ProductBaseUnit | null }),
  ),
});

export const getCatalogProductById = async (
  id: string,
): Promise<ProductCatalogProductDetailResponse> => {
  const response = await axiosInstance.get(API_PRODUCTS_GROUP.byIdP(id));
  return response.data;
};

export const updateProduct = async (id: string, payload: UpdateProductDto): Promise<Product> => {
  const response = await axiosInstance.patch(API_PRODUCTS_GROUP.update(id), payload);
  return response.data;
};

export const updateProductActive = async (
  id: string,
  payload: UpdateProductActiveDto
): Promise<Product> => {
  const response = await axiosInstance.patch(API_PRODUCTS_GROUP.updateActive(id), payload);
  return response.data;
};

export const listProducts = async (params: ListProductsQuery): Promise<ProductListResponse> => {
  const response = await axiosInstance.get(API_PRODUCTS_GROUP.base, { params });
  return normalizeProductList(response.data);
};

export const listProductsFlat = async (params: ListProductsQuery): Promise<ProductListResponse> => {
  return listProducts(params);
};

export const listCatalogProducts = async (
  params: Omit<ListProductsQuery, "type">,
): Promise<ProductListResponse> => {
  const response = await axiosInstance.get(API_PRODUCTS_GROUP.items, {
    params: {
      ...params,
      type: ProductTypes.PRODUCT,
    },
  });
  return normalizeProductList(response.data);
};

export const getProductSearchState = async (params?: { type?: string }): Promise<ProductSearchStateResponse> => {
  const response = await axiosInstance.get(API_PRODUCTS_GROUP.searchState, {
    params: params?.type ? { type: params.type } : undefined,
  });
  return response.data;
};

export const saveProductSearchMetric = async (
  name: string,
  snapshot: ProductSearchSnapshot,
  params?: { type?: string },
): Promise<{ type: string; message: string }> => {
  const response = await axiosInstance.post(
    API_PRODUCTS_GROUP.saveSearchMetric,
    { name, snapshot },
    { params: params?.type ? { type: params.type } : undefined },
  );
  return response.data;
};

export const deleteProductSearchMetric = async (
  metricId: string,
  params?: { type?: string },
): Promise<{ type: string; message: string }> => {
  const response = await axiosInstance.delete(API_PRODUCTS_GROUP.deleteSearchMetric(metricId), {
    params: params?.type ? { type: params.type } : undefined,
  });
  return response.data;
};

export const listCatalogMaterials = async (
  params: Omit<ListProductsQuery, "type">,
): Promise<ProductListResponse> => {
  const response = await axiosInstance.get(API_PRODUCTS_GROUP.items, {
    params: {
      ...params,
      type: ProductTypes.MATERIAL,
    },
  });
  return normalizeProductList(response.data);
};

export const getById = async (id: string): Promise<ProductDetailResponse> => {
  const data = await getCatalogProductById(id);
  return {
    ...data,
    product: attachBaseUnit({
      ...data.product,
      createdAt: data.product.createdAt ?? "",
      updatedAt: data.product.updatedAt ?? null,
      baseUnit: data.baseUnit?.name ?? null,
    }),
    skus: data.skus ?? [],
    baseUnit: data.baseUnit ?? null,
  };
};


