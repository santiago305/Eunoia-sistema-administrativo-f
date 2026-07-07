import type {
  SaleOrderItemComponentInput,
  SaleOrderSkuAttribute,
  SaleOrderSkuSnapshot,
  SaleOrderSkuUnit,
} from "@/features/sale-orders/types/saleOrder";

type ComponentSource = {
  id?: string | null;
  saleOrderItemId?: string | null;
  skuId?: string | null;
  skuLabel?: string | null;
  skuCode?: string | null;
  skuImage?: string | null;
  sku?: Partial<SaleOrderSkuSnapshot> & {
    attributes?: SaleOrderSkuAttribute[] | null;
  } | null;
  unit?: Partial<SaleOrderSkuUnit> | null;
  attributes?: Array<Partial<SaleOrderSkuAttribute>> | null;
  stockItemId?: string | null;
  quantity?: number | null;
  unitPrice?: number | null;
  total?: number | null;
  referencePackItemId?: string | null;
};

const text = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

const normalizeAttributes = (
  attributes?: Array<Partial<SaleOrderSkuAttribute>> | null,
): SaleOrderSkuAttribute[] =>
  (attributes ?? []).map((attribute) => ({
    code: text(attribute.code),
    name: text(attribute.name) || null,
    value: text(attribute.value),
  }));

export function normalizeSaleOrderItemComponent(
  source: ComponentSource,
): SaleOrderItemComponentInput {
  const skuId = text(source.sku?.id) || text(source.skuId);
  const legacyCode = text(source.skuCode);
  const skuAttributes = normalizeAttributes(
    source.attributes ?? source.sku?.attributes,
  );
  const unitId = text(source.unit?.id);

  return {
    id: text(source.id) || undefined,
    saleOrderItemId: text(source.saleOrderItemId) || undefined,
    sku: {
      id: skuId,
      productId: text(source.sku?.productId) || null,
      backendSku: text(source.sku?.backendSku) || legacyCode,
      customSku: text(source.sku?.customSku) || null,
      name: text(source.sku?.name) || text(source.skuLabel) || "SKU",
      barcode: text(source.sku?.barcode) || null,
      image: source.sku?.image ?? source.skuImage ?? null,
      price: Number(source.sku?.price ?? 0),
      cost: Number(source.sku?.cost ?? 0),
      isSellable: source.sku?.isSellable,
      isPurchasable: source.sku?.isPurchasable,
      isManufacturable: source.sku?.isManufacturable,
      isStockTracked: source.sku?.isStockTracked,
      isActive: source.sku?.isActive,
      createdAt: source.sku?.createdAt,
      updatedAt: source.sku?.updatedAt ?? null,
    },
    unit: unitId
      ? {
          id: unitId,
          name: text(source.unit?.name),
          code: text(source.unit?.code),
        }
      : null,
    attributes: skuAttributes,
    stockItemId: text(source.stockItemId) || null,
    quantity: Number(source.quantity ?? 0),
    unitPrice: Number(source.unitPrice ?? 0),
    total: Number(source.total ?? 0),
    referencePackItemId:
      text(source.referencePackItemId) || undefined,
  };
}

export function toSaleOrderItemComponentCommand(
  component: SaleOrderItemComponentInput,
) {
  return {
    skuId: component.sku?.id ?? component.skuId ?? "",
    quantity: Number(component.quantity ?? 0),
    unitPrice: Number(component.unitPrice ?? 0),
    total: Number(component.total ?? 0),
    ...(component.referencePackItemId
      ? { referencePackItemId: component.referencePackItemId }
      : {}),
  };
}

export function normalizeSaleOrderItems<
  T extends { components?: ComponentSource[] },
>(items: T[]) {
  return items.map((item) => ({
    ...item,
    components: (item.components ?? []).map(normalizeSaleOrderItemComponent),
  }));
}

export function toSaleOrderItemCommands<
  T extends { components?: SaleOrderItemComponentInput[] },
>(items: T[]) {
  return items.map((item) => ({
    ...item,
    components: (item.components ?? []).map(
      toSaleOrderItemComponentCommand,
    ),
  }));
}
