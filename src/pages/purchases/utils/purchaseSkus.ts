import type { ProductSkuAttribute, ProductSkuWithAttributes } from "@/pages/catalog/types/product";

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
  (attrs ?? [])
    .map((attr) => (attr.value ?? "").trim())
    .filter(Boolean)
    .join(" ");

export const buildPurchaseSkuLabel = (sku: PurchaseSkuInfo) => {
  const attrsText = formatSkuAttrs(sku.attributes);
  const skuPart = sku.backendSku ? ` -${sku.backendSku}` : "";
  const customPart = sku.customSku ? ` (${sku.customSku})` : "";
  const attrsPart = attrsText ? ` ${attrsText}` : "";
  return `${sku.name}${attrsPart}${skuPart}${customPart}`.trim();
};

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

