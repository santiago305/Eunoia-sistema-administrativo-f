export type SkuAttributeLike = { value?: string | null } | null | undefined;

export type SkuLike =
  | {
      id?: string | null;
      name?: string | null;
      backendSku?: string | null;
      customSku?: string | null;
      image?: string | null;
      attributes?: Array<SkuAttributeLike> | null;
    }
  | null
  | undefined;

const joinAttrValues = (attributes: Array<SkuAttributeLike> | null | undefined) => {
  return (attributes ?? [])
    .map((attr) => (attr?.value ?? "").trim())
    .filter(Boolean)
    .join(" ");
};

export function deriveSkuPresentation(sku: SkuLike, skuId?: string | null) {
  const safeSkuId = (skuId ?? "").trim();
  const rawName = (sku?.name ?? "").trim();
  const attrsText = joinAttrValues(sku?.attributes);

  const code = ((sku?.backendSku ?? sku?.customSku ?? safeSkuId) ?? "").trim();
  const skuCode = code || "-";
  const skuImage = sku?.image ?? null;

  if (!rawName && !attrsText && safeSkuId) {
    return { skuLabel: safeSkuId, skuCode: safeSkuId, skuImage };
  }

  const name = rawName || "SKU";
  const attrsPart = attrsText ? ` ${attrsText}` : "";
  const codePart = skuCode && skuCode !== "-" ? ` (${skuCode})` : "";

  const skuLabel = `${name}${attrsPart}${codePart}`.trim() || safeSkuId || "SKU";
  return { skuLabel, skuCode, skuImage };
}

