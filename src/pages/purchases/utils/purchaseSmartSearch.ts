import type { DataTableSearchChip } from "@/components/table/search";
import type {
  PurchaseRecentSearch,
  PurchaseSavedMetric,
  PurchaseSearchFilters,
  PurchaseSearchSnapshot,
  PurchaseSearchStateResponse,
} from "../types/purchase";

export type PurchaseSearchFilterKey = keyof PurchaseSearchFilters;

export type PurchaseSearchChip = DataTableSearchChip<PurchaseSearchFilterKey>;

export const PURCHASE_SEARCH_FILTER_LABELS: Record<PurchaseSearchFilterKey, string> = {
  supplierIds: "Proveedor",
  warehouseIds: "Almacen",
  statuses: "Estado",
  documentTypes: "Tipo",
  paymentForms: "Forma",
};

export function createEmptyPurchaseSearchFilters(): PurchaseSearchFilters {
  return {
    supplierIds: [],
    warehouseIds: [],
    statuses: [],
    documentTypes: [],
    paymentForms: [],
  };
}

export function createEmptyPurchaseSearchSnapshot(): PurchaseSearchSnapshot {
  return {
    filters: createEmptyPurchaseSearchFilters(),
  };
}

export function sanitizePurchaseSearchSnapshot(
  snapshot?: Partial<PurchaseSearchSnapshot> | null,
): PurchaseSearchSnapshot {
  const q = snapshot?.q?.trim();
  const filters = snapshot?.filters;

  return {
    q: q || undefined,
    filters: {
      supplierIds: Array.from(new Set((filters?.supplierIds ?? []).filter(Boolean))),
      warehouseIds: Array.from(new Set((filters?.warehouseIds ?? []).filter(Boolean))),
      statuses: Array.from(new Set((filters?.statuses ?? []).filter(Boolean))),
      documentTypes: Array.from(new Set((filters?.documentTypes ?? []).filter(Boolean))),
      paymentForms: Array.from(new Set((filters?.paymentForms ?? []).filter(Boolean))),
    },
  };
}

export function hasPurchaseSearchCriteria(snapshot: PurchaseSearchSnapshot) {
  return Boolean(
    snapshot.q ||
      snapshot.filters.supplierIds.length ||
      snapshot.filters.warehouseIds.length ||
      snapshot.filters.statuses.length ||
      snapshot.filters.documentTypes.length ||
      snapshot.filters.paymentForms.length,
  );
}

export function togglePurchaseSearchOption(
  snapshot: PurchaseSearchSnapshot,
  key: PurchaseSearchFilterKey,
  optionId: string,
) {
  const current = snapshot.filters[key] as string[];
  const exists = current.includes(optionId);
  const nextValues = exists
    ? current.filter((value) => value !== optionId)
    : [...current, optionId];

  return sanitizePurchaseSearchSnapshot({
    ...snapshot,
    filters: {
      ...snapshot.filters,
      [key]: nextValues,
    },
  });
}

export function removePurchaseSearchKey(
  snapshot: PurchaseSearchSnapshot,
  key: "q" | PurchaseSearchFilterKey,
) {
  if (key === "q") {
    return sanitizePurchaseSearchSnapshot({
      ...snapshot,
      q: undefined,
    });
  }

  return sanitizePurchaseSearchSnapshot({
    ...snapshot,
    filters: {
      ...snapshot.filters,
      [key]: [],
    },
  });
}

function createCatalogMaps(searchState?: PurchaseSearchStateResponse | null) {
  return {
    supplierIds: new Map(searchState?.catalogs.suppliers.map((item) => [item.id, item.label]) ?? []),
    warehouseIds: new Map(searchState?.catalogs.warehouses.map((item) => [item.id, item.label]) ?? []),
    statuses: new Map(searchState?.catalogs.statuses.map((item) => [item.id, item.label]) ?? []),
    documentTypes: new Map(searchState?.catalogs.documentTypes.map((item) => [item.id, item.label]) ?? []),
    paymentForms: new Map(searchState?.catalogs.paymentForms.map((item) => [item.id, item.label]) ?? []),
  };
}

export function buildPurchaseSearchLabel(
  snapshot: PurchaseSearchSnapshot,
  searchState?: PurchaseSearchStateResponse | null,
) {
  const normalized = sanitizePurchaseSearchSnapshot(snapshot);
  const catalogMaps = createCatalogMaps(searchState);
  const parts: string[] = [];

  if (normalized.q) {
    parts.push(`Busqueda: ${normalized.q}`);
  }

  (Object.keys(PURCHASE_SEARCH_FILTER_LABELS) as PurchaseSearchFilterKey[]).forEach((key) => {
    const selected = normalized.filters[key];
    if (!selected.length) return;
    const labels = selected.map((item) => catalogMaps[key].get(item) ?? item);
    parts.push(`${PURCHASE_SEARCH_FILTER_LABELS[key]}: ${labels.join(" - ")}`);
  });

  return parts.join(" | ") || "Busqueda guardada";
}

export function buildPurchaseSearchChips(
  snapshot: PurchaseSearchSnapshot,
  searchState?: PurchaseSearchStateResponse | null,
): PurchaseSearchChip[] {
  const normalized = sanitizePurchaseSearchSnapshot(snapshot);
  const catalogMaps = createCatalogMaps(searchState);
  const chips: PurchaseSearchChip[] = [];

  if (normalized.q) {
    chips.push({
      id: "q",
      label: `Busqueda: ${normalized.q}`,
      removeKey: "q",
    });
  }

  (Object.keys(PURCHASE_SEARCH_FILTER_LABELS) as PurchaseSearchFilterKey[]).forEach((key) => {
    const selected = normalized.filters[key];
    if (!selected.length) return;
    const labels = selected.map((item) => catalogMaps[key].get(item) ?? item);
    chips.push({
      id: key,
      label: `${PURCHASE_SEARCH_FILTER_LABELS[key]}: ${labels.join(" - ")}`,
      removeKey: key,
    });
  });

  return chips;
}

export function getPurchaseSearchSelectionCount(
  snapshot: PurchaseSearchSnapshot,
  key: PurchaseSearchFilterKey,
) {
  return snapshot.filters[key].length;
}

export function clonePurchaseRecentSearches(value: PurchaseRecentSearch[] | undefined) {
  return [...(value ?? [])];
}

export function clonePurchaseSavedMetrics(value: PurchaseSavedMetric[] | undefined) {
  return [...(value ?? [])];
}
