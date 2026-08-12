import type {
  SaleOrderItemComponentInput,
  SaleOrderItemInput,
  SaleOrderPackMatchComponentInput,
  SaleOrderPackMatchResponse,
} from "@/features/sale-orders/types/saleOrder";

export type IndependentProductMatchCandidate = {
  itemIndexes: number[];
  composition: SaleOrderPackMatchComponentInput[];
};

const roundTwoDecimals = (value: unknown) => {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) return 0;
  return Math.round((numeric + Number.EPSILON) * 100) / 100;
};

const getComponentSkuId = (component: SaleOrderItemComponentInput) =>
  (component.sku?.id ?? component.skuId ?? "").trim();

const isStructurallyIndependent = (item: SaleOrderItemInput) =>
  !item.referencePackId && (item.components ?? []).length === 1;

const normalizeComposition = (
  components: SaleOrderPackMatchComponentInput[],
) => {
  const quantities = new Map<string, number>();

  for (const component of components) {
    const skuId = component.skuId.trim();
    const quantity = roundTwoDecimals(component.quantity);
    if (!skuId || quantity <= 0) return null;
    quantities.set(
      skuId,
      roundTwoDecimals((quantities.get(skuId) ?? 0) + quantity),
    );
  }

  return [...quantities.entries()]
    .map(([skuId, quantity]) => ({ skuId, quantity }))
    .sort((left, right) => left.skuId.localeCompare(right.skuId));
};

const compositionKey = (composition: SaleOrderPackMatchComponentInput[]) =>
  composition
    .map(({ skuId, quantity }) => `${skuId}:${quantity.toFixed(2)}`)
    .join("|");

export function getIndependentProductMatchCandidate(
  items: SaleOrderItemInput[],
): IndependentProductMatchCandidate | null {
  const itemIndexes: number[] = [];
  const components: SaleOrderPackMatchComponentInput[] = [];

  items.forEach((item, itemIndex) => {
    if (!isStructurallyIndependent(item)) return;

    const component = item.components![0];
    const skuId = getComponentSkuId(component);
    const quantity = roundTwoDecimals(component.quantity);
    itemIndexes.push(itemIndex);
    components.push({ skuId, quantity });
  });

  if (itemIndexes.length === 0) return null;

  const composition = normalizeComposition(components);
  if (!composition || composition.length < 2) return null;

  return { itemIndexes, composition };
}

function mergeIndependentComponents(
  items: SaleOrderItemInput[],
  candidate: IndependentProductMatchCandidate,
) {
  const bySku = new Map<string, SaleOrderItemComponentInput>();

  for (const itemIndex of candidate.itemIndexes) {
    const component = items[itemIndex].components![0];
    const skuId = getComponentSkuId(component);
    const previous = bySku.get(skuId);
    const quantity = roundTwoDecimals(
      (previous?.quantity ?? 0) + Number(component.quantity ?? 0),
    );
    const total = roundTwoDecimals(
      (previous?.total ?? 0) + Number(component.total ?? 0),
    );

    bySku.set(skuId, {
      ...(previous ?? component),
      id: undefined,
      saleOrderItemId: undefined,
      skuId,
      quantity,
      unitPrice: quantity > 0 ? roundTwoDecimals(total / quantity) : 0,
      total,
      referencePackItemId: undefined,
    });
  }

  return bySku;
}

export function groupIndependentProductsAsMatchedPack(
  items: SaleOrderItemInput[],
  match: SaleOrderPackMatchResponse,
): SaleOrderItemInput[] {
  if (match.status !== "UNIQUE") return items;

  const candidate = getIndependentProductMatchCandidate(items);
  const responseComposition = normalizeComposition(match.composition);
  const packComposition = normalizeComposition(
    match.pack.components.map(({ skuId, quantity }) => ({ skuId, quantity })),
  );
  if (
    !candidate ||
    !responseComposition ||
    !packComposition ||
    compositionKey(candidate.composition) !==
      compositionKey(responseComposition) ||
    compositionKey(candidate.composition) !== compositionKey(packComposition)
  ) {
    return items;
  }

  const mergedComponents = mergeIndependentComponents(items, candidate);
  const components = match.pack.components.map((packComponent) => {
    const component = mergedComponents.get(packComponent.skuId);
    if (!component) return null;
    return {
      ...component,
      referencePackItemId: packComponent.id,
    };
  });
  if (components.some((component) => component === null)) return items;

  const candidateIndexes = new Set(candidate.itemIndexes);
  const firstIndex = candidate.itemIndexes[0];
  const commercialTotal = roundTwoDecimals(
    candidate.itemIndexes.reduce(
      (total, itemIndex) => total + Number(items[itemIndex].total ?? 0),
      0,
    ),
  );
  const packItem: SaleOrderItemInput = {
    quantity: 1,
    basePrice: roundTwoDecimals(match.pack.total),
    unitPrice: commercialTotal,
    total: commercialTotal,
    description: match.pack.description,
    referencePackId: match.pack.id,
    components: components as SaleOrderItemComponentInput[],
  };

  const groupedItems: SaleOrderItemInput[] = [];
  items.forEach((item, itemIndex) => {
    if (itemIndex === firstIndex) groupedItems.push(packItem);
    if (!candidateIndexes.has(itemIndex)) groupedItems.push(item);
  });

  return groupedItems;
}
