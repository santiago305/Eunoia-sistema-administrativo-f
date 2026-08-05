import type { ProductSkuAttribute, ProductSkuWithAttributes } from "@/features/catalog/types/product";
import { buildSkuDisplayLabel, formatSkuAttributes } from "@/features/catalog/utils/skuLabel";

export type PurchaseSkuInfo = {
  skuId: string;
  productId?: string;
  name: string;
  backendSku?: string;
  customSku?: string | null;
  unitName?: string;
  unitCode?: string;
  attributes: ProductSkuAttribute[];
};

export const formatSkuAttrs = (attrs?: ProductSkuAttribute[]) =>
  formatSkuAttributes(attrs);

export const buildPurchaseSkuLabel = (sku: PurchaseSkuInfo) => buildSkuDisplayLabel(sku);

export const mapSkuToPurchaseSkuInfo = (row: ProductSkuWithAttributes): PurchaseSkuInfo => ({
  skuId: row.sku.id,
  productId: row.sku.productId,
  name: row.sku.name ?? "SKU",
  backendSku: row.sku.backendSku ?? undefined,
  customSku: row.sku.customSku ?? null,
  unitName: row.unit?.name ?? undefined,
  unitCode: row.unit?.code ?? undefined,
  attributes: row.attributes ?? [],
});

export const mergePurchaseSkus = (current: PurchaseSkuInfo[], incoming: PurchaseSkuInfo[]) => {
  const map = new Map<string, PurchaseSkuInfo>();
  current.forEach((item) => map.set(item.skuId, item));
  incoming.forEach((item) => map.set(item.skuId, item));
  return Array.from(map.values());
};

