import type { ProductionOrderItemSummaryEntry } from "@/features/production/types/production";

export const buildProductionItemSummaryLabel = (item: ProductionOrderItemSummaryEntry) => {
  const name = item.name?.trim() || "Articulo";
  const attribute = item.attributeValue?.trim();
  const skuCode = item.customSku?.trim() || item.backendSku?.trim();

  if (attribute) return `${name} ${attribute}`;
  if (skuCode) return `${name} ${skuCode}`;
  return name;
};
