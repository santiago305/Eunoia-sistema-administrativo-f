export type EquivalenceDraftLike = {
  id: string;
  fromUnitId: string;
  toUnitId: string;
  factor: number;
};

export type ProductCatalogSkuResponseLike = {
  sku: {
    id: string;
    name?: string;
    customSku?: string | null;
    barcode?: string | null;
    price?: number;
    cost?: number;
    isActive?: boolean;
    [key: string]: unknown;
  };
  attributes: Array<{
    code: string;
    name?: string | null;
    value: string;
  }>;
};

type RecipeDraft = {
  yieldQuantity: string;
  notes: string;
  items: Array<{
    id: string;
    materialSkuId: string;
    quantity: string;
    unitId: string;
  }>;
};

export type DraftRecipesBySku = Record<string, RecipeDraft>;

export type ProductSkuDraftLike = {
  id: string;
  name: string;
  customSku: string;
  barcode: string;
  price: string;
  cost: string;
  presentation: string;
  variant: string;
  color: string;
  isActive: boolean;
  autoFillName: boolean;
};

export type ProductCatalogSkuUpdatePayloadLike = {
  name?: string;
  customSku?: string | null;
  barcode?: string | null;
  price?: number;
  cost?: number;
  isActive?: boolean;
  attributes?: Array<{
    code: string;
    name?: string;
    value: string;
  }>;
};

export type PendingCreateState = {
  createdProductId: string | null;
  createdSkuIdsByDraftId: Record<string, string>;
  recipeFailures: string[];
  nonPersistedDrafts: string[];
  equivalenceFailures: EquivalenceDraftLike[];
};

export const createEmptyProductCreateDraft = () => ({
  equivalences: [] as EquivalenceDraftLike[],
  recipesBySku: {} as DraftRecipesBySku,
});

export const createEmptyPendingCreateState = (): PendingCreateState => ({
  createdProductId: null,
  createdSkuIdsByDraftId: {},
  recipeFailures: [],
  nonPersistedDrafts: [],
  equivalenceFailures: [],
});

export const mapCreatedSkuIdsByDraftId = (
  createdSkus: Array<{ draftId: string; response: ProductCatalogSkuResponseLike }>,
) =>
  createdSkus.reduce<Record<string, string>>((acc, current) => {
    acc[current.draftId] = current.response.sku.id;
    return acc;
  }, {});

const getAttributeValue = (
  attributes: ProductCatalogSkuResponseLike["attributes"],
  code: string,
) => attributes.find((attribute) => attribute.code === code)?.value ?? "";

export const mapSkuResponseToDraftRow = (
  skuResponse: ProductCatalogSkuResponseLike,
): ProductSkuDraftLike => ({
  id: skuResponse.sku.id,
  name: String(skuResponse.sku.name ?? ""),
  customSku: String(skuResponse.sku.customSku ?? ""),
  barcode: String(skuResponse.sku.barcode ?? ""),
  price: String(skuResponse.sku.price ?? 0),
  cost: String(skuResponse.sku.cost ?? 0),
  presentation: getAttributeValue(skuResponse.attributes, "presentation"),
  variant: getAttributeValue(skuResponse.attributes, "variant"),
  color: getAttributeValue(skuResponse.attributes, "color"),
  isActive: Boolean(skuResponse.sku.isActive ?? true),
  autoFillName: false,
});

export const mapSkuDraftRowsById = (rows: ProductSkuDraftLike[]) =>
  rows.reduce<Record<string, ProductSkuDraftLike>>((acc, row) => {
    acc[row.id] = row;
    return acc;
  }, {});

export const buildSkuUpdatePayload = (
  row: ProductSkuDraftLike,
): ProductCatalogSkuUpdatePayloadLike => ({
  name: row.name.trim() || undefined,
  customSku: row.customSku.trim() || null,
  barcode: row.barcode.trim() || null,
  price: row.price.trim() ? Number(row.price) : 0,
  cost: row.cost.trim() ? Number(row.cost) : 0,
  isActive: row.isActive,
  attributes: [
    row.presentation.trim()
      ? { code: "presentation", name: "Presentacion", value: row.presentation.trim() }
      : null,
    row.variant.trim()
      ? { code: "variant", name: "Variante", value: row.variant.trim() }
      : null,
    row.color.trim()
      ? { code: "color", name: "Color", value: row.color.trim() }
      : null,
  ].filter(Boolean) as ProductCatalogSkuUpdatePayloadLike["attributes"],
});

export const hasSkuDraftChanges = (
  currentRow: ProductSkuDraftLike,
  baselineRow?: ProductSkuDraftLike,
) => {
  if (!baselineRow) return true;
  return JSON.stringify(buildSkuUpdatePayload(currentRow)) !== JSON.stringify(buildSkuUpdatePayload(baselineRow));
};

export const classifyRecipeDraftPersistence = ({
  recipesBySku,
  persistedDraftIds,
  createdSkuIdsByDraftId,
  hasPersistableItems,
}: {
  recipesBySku: DraftRecipesBySku;
  persistedDraftIds: Iterable<string>;
  createdSkuIdsByDraftId: Record<string, string>;
  hasPersistableItems: (recipeDraft: RecipeDraft) => boolean;
}) => {
  const persistedIds = new Set(persistedDraftIds);
  const retryableRecipes: Array<{ draftId: string; skuId: string; recipeDraft: RecipeDraft }> = [];
  const nonPersistedDrafts: string[] = [];

  Object.entries(recipesBySku).forEach(([draftId, recipeDraft]) => {
    if (!hasPersistableItems(recipeDraft)) return;

    if (!persistedIds.has(draftId)) {
      nonPersistedDrafts.push(draftId);
      return;
    }

    const skuId = createdSkuIdsByDraftId[draftId];
    if (!skuId) {
      nonPersistedDrafts.push(draftId);
      return;
    }

    retryableRecipes.push({ draftId, skuId, recipeDraft });
  });

  return { retryableRecipes, nonPersistedDrafts };
};

export const retainRecipeDraftsByIds = (
  recipesBySku: DraftRecipesBySku,
  draftIds: Iterable<string>,
) => {
  const ids = new Set(draftIds);
  return Object.entries(recipesBySku).reduce<DraftRecipesBySku>((acc, [draftId, recipeDraft]) => {
    if (ids.has(draftId)) {
      acc[draftId] = recipeDraft;
    }
    return acc;
  }, {});
};

export const shouldKeepCreateModalOpen = ({
  equivalenceFailures,
  recipeFailures,
  nonPersistedDrafts,
}: {
  equivalenceFailures: EquivalenceDraftLike[];
  recipeFailures: string[];
  nonPersistedDrafts: string[];
}) =>
  equivalenceFailures.length > 0 ||
  recipeFailures.length > 0 ||
  nonPersistedDrafts.length > 0;
