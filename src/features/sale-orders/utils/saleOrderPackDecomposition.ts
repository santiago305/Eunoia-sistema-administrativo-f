import type { PackDetailResponse } from "@/features/catalog/types/pack";
import type {
  SaleOrderItemComponentInput,
  SaleOrderItemInput,
} from "@/features/sale-orders/types/saleOrder";

const round = (value: number) =>
  Math.round((Number(value) + Number.EPSILON) * 100) / 100;

const skuIdOf = (component: SaleOrderItemComponentInput) =>
  component.skuId ?? component.sku?.id ?? "";

const allocate = (total: number, weights: number[]) => {
  if (!weights.length) return [];
  const cents = Math.round(round(total) * 100);
  const safeWeights = weights.map((weight) =>
    Number.isFinite(weight) && weight > 0 ? weight : 0,
  );
  const weightTotal = safeWeights.reduce((sum, weight) => sum + weight, 0);
  const effective = weightTotal > 0 ? safeWeights : weights.map(() => 1);
  const effectiveTotal = effective.reduce((sum, weight) => sum + weight, 0);
  let assigned = 0;
  return effective.map((weight, index) => {
    const value =
      index === effective.length - 1
        ? cents - assigned
        : Math.floor((cents * weight) / effectiveTotal);
    assigned += value;
    return value / 100;
  });
};

export type PackDecompositionProposal = {
  packQuantity: number;
  packItem: SaleOrderItemInput;
  leftoverItems: SaleOrderItemInput[];
  replacements: SaleOrderItemInput[];
};

export type PackDecompositionResult =
  | { ok: true; proposal: PackDecompositionProposal }
  | { ok: false; message: string };

export function buildPackDecomposition(
  item: SaleOrderItemInput,
  detail: PackDetailResponse,
): PackDecompositionResult {
  const sourceBySkuId = new Map<string, SaleOrderItemComponentInput>();
  for (const component of item.components ?? []) {
    const skuId = skuIdOf(component);
    if (!skuId) continue;
    const current = sourceBySkuId.get(skuId);
    sourceBySkuId.set(
      skuId,
      current
        ? {
            ...current,
            quantity: round(current.quantity + component.quantity),
            total: round(current.total + component.total),
          }
        : { ...component, skuId },
    );
  }

  if (!detail.items.length) {
    return { ok: false, message: "El pack seleccionado no tiene productos." };
  }

  const quantities = detail.items.map((packComponent) => {
    const available = Number(
      sourceBySkuId.get(packComponent.skuId)?.quantity ?? 0,
    );
    const required = Number(packComponent.quantity ?? 0);
    return required > 0 ? Math.floor(available / required) : 0;
  });
  const packQuantity = Math.min(...quantities);
  if (!Number.isFinite(packQuantity) || packQuantity < 1) {
    return {
      ok: false,
      message:
        "La composición actual no contiene todos los productos y cantidades de este pack.",
    };
  }

  const originalTotal = round(item.total);
  const catalogPackTotal = round(Number(detail.pack.total ?? 0));
  const packTotal = round(catalogPackTotal * packQuantity);
  const consumedBySkuId = new Map(
    detail.items.map((component) => [
      component.skuId,
      round(Number(component.quantity) * packQuantity),
    ]),
  );
  const leftovers = [...sourceBySkuId.entries()]
    .map(([skuId, component]) => ({
      skuId,
      component,
      quantity: round(
        component.quantity - Number(consumedBySkuId.get(skuId) ?? 0),
      ),
    }))
    .filter((entry) => entry.quantity > 0);

  const effectivePackTotal = leftovers.length ? packTotal : originalTotal;
  if (leftovers.length && packTotal > originalTotal) {
    return {
      ok: false,
      message: `El pack cuesta S/ ${packTotal.toFixed(2)} y supera el total de la agrupación (S/ ${originalTotal.toFixed(2)}).`,
    };
  }

  const packComponentTotals = allocate(
    effectivePackTotal,
    detail.items.map(
      (component) =>
        Number(component.lineTotal ?? 0) * packQuantity,
    ),
  );
  const packComponents: SaleOrderItemComponentInput[] = detail.items.map(
    (component, index) => {
      const source = sourceBySkuId.get(component.skuId);
      const quantity = round(Number(component.quantity) * packQuantity);
      const total = packComponentTotals[index] ?? 0;
      return {
        skuId: component.skuId,
        skuLabel: source?.skuLabel,
        skuCode: source?.skuCode,
        skuImage: source?.skuImage ?? component.sku?.image ?? null,
        sku: source?.sku,
        unit: source?.unit,
        attributes: source?.attributes,
        stockItemId: source?.stockItemId,
        quantity,
        basePrice: Number(component.price ?? component.sku?.price ?? 0),
        unitPrice: quantity > 0 ? round(total / quantity) : 0,
        total,
        referencePackItemId: component.id,
      };
    },
  );
  const description = String(detail.pack.description ?? "").trim() || "Pack";
  const packItem: SaleOrderItemInput = {
    description,
    referencePackId:
      typeof detail.pack.packId === "string"
        ? detail.pack.packId
        : detail.pack.packId?.value,
    packNameSnapshot: description,
    quantity: packQuantity,
    basePrice: catalogPackTotal,
    unitPrice:
      packQuantity > 0 ? round(effectivePackTotal / packQuantity) : 0,
    total: effectivePackTotal,
    components: packComponents,
  };

  const leftoverTotal = round(originalTotal - effectivePackTotal);
  const leftoverTotals = allocate(
    leftoverTotal,
    leftovers.map(({ component, quantity }) => {
      const price = Number(
        component.basePrice ?? component.sku?.price ?? component.unitPrice ?? 0,
      );
      return (price > 0 ? price : 1) * quantity;
    }),
  );
  const leftoverItems = leftovers.map(
    ({ skuId, component, quantity }, index): SaleOrderItemInput => {
      const total = leftoverTotals[index] ?? 0;
      const unitPrice = quantity > 0 ? round(total / quantity) : 0;
      const cleanComponent: SaleOrderItemComponentInput = {
        ...component,
        id: undefined,
        saleOrderItemId: undefined,
        skuId,
        quantity,
        unitPrice,
        total,
        referencePackItemId: undefined,
      };
      return {
        description:
          component.skuLabel ?? component.sku?.name ?? component.skuCode ?? skuId,
        quantity,
        basePrice:
          component.basePrice ?? component.sku?.price ?? component.unitPrice,
        unitPrice,
        total,
        components: [cleanComponent],
      };
    },
  );

  return {
    ok: true,
    proposal: {
      packQuantity,
      packItem,
      leftoverItems,
      replacements: [packItem, ...leftoverItems],
    },
  };
}
