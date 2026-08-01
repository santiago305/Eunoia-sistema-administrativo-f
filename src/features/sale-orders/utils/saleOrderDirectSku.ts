import type { ProductSkuWithAttributes } from "@/features/catalog/types/product";
import type {
  SaleOrderItemComponentInput,
  SaleOrderItemInput,
  SaleOrderSkuAttribute,
  SaleOrderSkuSnapshot,
  SaleOrderSkuUnit,
} from "@/features/sale-orders/types/saleOrder";
import { deriveSkuPresentation } from "@/features/sale-orders/utils/skuPresentation";

const money = (value: unknown) => {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) return 0;
  return Math.round(numeric * 100) / 100;
};

const normalizeAttributes = (
  attributes: ProductSkuWithAttributes["attributes"],
): SaleOrderSkuAttribute[] =>
  (attributes ?? []).map((attribute) => ({
    code: (attribute.code ?? "").trim(),
    name: (attribute.name ?? "").trim() || null,
    value: (attribute.value ?? "").trim(),
  }));

const normalizeUnit = (
  unit: ProductSkuWithAttributes["unit"],
): SaleOrderSkuUnit | null => {
  if (!unit?.id) return null;
  return {
    id: unit.id,
    name: unit.name ?? "",
    code: unit.code ?? "",
  };
};

const buildSkuSnapshot = (
  item: ProductSkuWithAttributes,
): SaleOrderSkuSnapshot => ({
  id: item.sku.id,
  productId: item.sku.productId ?? null,
  backendSku: item.sku.backendSku ?? "",
  customSku: item.sku.customSku ?? null,
  name: item.sku.name?.trim() ?? "",
  barcode: item.sku.barcode ?? null,
  image: item.sku.image ?? null,
  price: money(item.sku.price),
  cost: money(item.sku.cost),
  isSellable: item.sku.isSellable,
  isPurchasable: item.sku.isPurchasable,
  isManufacturable: item.sku.isManufacturable,
  isStockTracked: item.sku.isStockTracked,
  isActive: item.sku.isActive,
  createdAt: item.sku.createdAt,
  updatedAt: item.sku.updatedAt ?? null,
});

export function buildSaleOrderItemFromSku(
  item: ProductSkuWithAttributes,
): SaleOrderItemInput {
  const attributes = normalizeAttributes(item.attributes);
  const sku = buildSkuSnapshot(item);
  const presentation = deriveSkuPresentation(
    { ...sku, attributes },
    item.sku.id,
  );
  const unitPrice = money(item.sku.price);

  const component: SaleOrderItemComponentInput = {
    skuId: item.sku.id,
    skuLabel: presentation.skuLabel,
    skuCode: presentation.skuCode,
    skuImage: presentation.skuImage,
    sku,
    unit: normalizeUnit(item.unit),
    attributes,
    stockItemId: item.stockItemId ?? null,
    quantity: 1,
    basePrice: unitPrice,
    unitPrice,
    total: unitPrice,
    referencePackItemId: undefined,
  };

  return {
    quantity: 1,
    basePrice: unitPrice,
    unitPrice,
    total: unitPrice,
    description: presentation.skuLabel,
    referencePackId: undefined,
    components: [component],
  };
}
