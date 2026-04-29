import type {
  DataTableSearchChip,
  SmartSearchFieldConfig,
  SmartSearchOperatorOption,
  SmartSearchRule,
  DataTableSearchOption,
} from "@/shared/components/table/search";
import type {
  InventoryLedgerSearchField,
  InventoryLedgerSearchOperator,
  InventoryLedgerSearchSnapshot,
  InventoryLedgerSearchStateResponse,
} from "@/features/catalog/types/inventoryLedgerSearch";
import { InventoryLedgerSearchFields } from "@/features/catalog/types/inventoryLedgerSearch";

export type InventoryLedgerSearchFilterKey = InventoryLedgerSearchField;

export type InventoryLedgerSearchRule = SmartSearchRule<
  InventoryLedgerSearchField,
  InventoryLedgerSearchOperator
>;

export type InventoryLedgerSearchChip = DataTableSearchChip<InventoryLedgerSearchFilterKey>;

export type InventoryLedgerSmartSearchColumn = SmartSearchFieldConfig<
  InventoryLedgerSearchFilterKey,
  InventoryLedgerSearchOperator
>;

type OperatorOption = SmartSearchOperatorOption<InventoryLedgerSearchOperator>;

const FIELD_ORDER: InventoryLedgerSearchField[] = [
  InventoryLedgerSearchFields.SKU,
  InventoryLedgerSearchFields.WAREHOUSE_ID,
  InventoryLedgerSearchFields.USER_ID,
  InventoryLedgerSearchFields.DIRECTION,
];

const FIELD_LABELS: Record<InventoryLedgerSearchField, string> = {
  [InventoryLedgerSearchFields.SKU]: "Producto (SKU)",
  [InventoryLedgerSearchFields.WAREHOUSE_ID]: "Almacén",
  [InventoryLedgerSearchFields.USER_ID]: "Usuario",
  [InventoryLedgerSearchFields.DIRECTION]: "E/S",
};

const IN_OPERATOR: OperatorOption[] = [{ id: "IN", label: "Es alguno de" }];

function uniqueStrings(values: string[] | undefined) {
  return Array.from(new Set((values ?? []).map((value) => value?.trim()).filter(Boolean))) as string[];
}

function sanitizeRule(rule?: Partial<InventoryLedgerSearchRule> | null): InventoryLedgerSearchRule | null {
  if (!rule?.field || !rule.operator) return null;
  if (!FIELD_ORDER.includes(rule.field)) return null;

  if (
    rule.field === InventoryLedgerSearchFields.WAREHOUSE_ID ||
    rule.field === InventoryLedgerSearchFields.USER_ID ||
    rule.field === InventoryLedgerSearchFields.DIRECTION ||
    rule.field === InventoryLedgerSearchFields.SKU
  ) {
    if (rule.operator !== "IN") return null;
    const values = uniqueStrings(rule.values ?? (rule.value ? [rule.value] : undefined));
    if (!values.length) return null;
    return { field: rule.field, operator: "IN", values };
  }

  return null;
}

export function createEmptyInventoryLedgerSearchFilters(): InventoryLedgerSearchRule[] {
  return [];
}

export function sanitizeInventoryLedgerSearchSnapshot(
  snapshot?: Partial<InventoryLedgerSearchSnapshot> | { q?: string; filters?: unknown } | null,
): InventoryLedgerSearchSnapshot {
  const q = snapshot?.q?.trim();
  const rawFilters = Array.isArray(snapshot?.filters) ? snapshot.filters : [];
  const merged = new Map<InventoryLedgerSearchField, InventoryLedgerSearchRule>();

  rawFilters.forEach((rule) => {
    const normalized = sanitizeRule(rule as InventoryLedgerSearchRule);
    if (!normalized) return;

    const existing = merged.get(normalized.field);
    if (normalized.operator === "IN" && existing?.operator === "IN") {
      merged.set(normalized.field, {
        field: normalized.field,
        operator: "IN",
        values: uniqueStrings([...(existing.values ?? []), ...(normalized.values ?? [])]),
      });
      return;
    }

    merged.set(normalized.field, normalized);
  });

  return {
    q: q || undefined,
    filters: FIELD_ORDER.map((field) => merged.get(field)).filter(Boolean) as InventoryLedgerSearchRule[],
  };
}

export function hasInventoryLedgerSearchCriteria(snapshot?: Partial<InventoryLedgerSearchSnapshot> | null) {
  const normalized = sanitizeInventoryLedgerSearchSnapshot(snapshot);
  return Boolean(normalized.q || normalized.filters.length);
}

export function findInventoryLedgerSearchRule(snapshot: InventoryLedgerSearchSnapshot, key: InventoryLedgerSearchFilterKey) {
  return sanitizeInventoryLedgerSearchSnapshot(snapshot).filters.find((rule) => rule.field === key) ?? null;
}

export function upsertInventoryLedgerSearchRule(
  snapshot: InventoryLedgerSearchSnapshot,
  rule: InventoryLedgerSearchRule,
) {
  const normalized = sanitizeInventoryLedgerSearchSnapshot(snapshot);
  const nextRule = sanitizeRule(rule);
  if (!nextRule) return removeInventoryLedgerSearchKey(normalized, rule.field);

  return sanitizeInventoryLedgerSearchSnapshot({
    ...normalized,
    filters: [...normalized.filters.filter((item) => item.field !== nextRule.field), nextRule],
  });
}

export function removeInventoryLedgerSearchKey(snapshot: InventoryLedgerSearchSnapshot, key: "q" | InventoryLedgerSearchFilterKey) {
  const normalized = sanitizeInventoryLedgerSearchSnapshot(snapshot);
  if (key === "q") return sanitizeInventoryLedgerSearchSnapshot({ ...normalized, q: undefined });
  return sanitizeInventoryLedgerSearchSnapshot({
    ...normalized,
    filters: normalized.filters.filter((rule) => rule.field !== key),
  });
}

export function getInventoryLedgerSearchSelectionCount(snapshot: InventoryLedgerSearchSnapshot, key: InventoryLedgerSearchFilterKey) {
  const rule = findInventoryLedgerSearchRule(snapshot, key);
  if (!rule) return 0;
  if (rule.operator === "IN") return rule.values?.length ?? 0;
  return 1;
}

export function getInventoryLedgerSearchRuleSummary(
  snapshot: InventoryLedgerSearchSnapshot,
  key: InventoryLedgerSearchFilterKey,
  searchState?: InventoryLedgerSearchStateResponse | null,
  options?: { skuOptions?: DataTableSearchOption[] },
) {
  const rule = findInventoryLedgerSearchRule(snapshot, key);
  if (!rule) return null;

  if (rule.operator === "IN") {
    const values = rule.values ?? [];
    if (!values.length) return null;

    const availableOptions =
      key === InventoryLedgerSearchFields.WAREHOUSE_ID
        ? searchState?.catalogs.warehouses
        : key === InventoryLedgerSearchFields.USER_ID
          ? searchState?.catalogs.users
          : key === InventoryLedgerSearchFields.DIRECTION
            ? searchState?.catalogs.directions
            : key === InventoryLedgerSearchFields.SKU
              ? options?.skuOptions
              : [];

    const map = new Map((availableOptions ?? []).map((option) => [option.id, option.label]));
    return values.map((value) => map.get(value) ?? value).join(" - ");
  }

  const operatorLabel = rule.operator === "CONTAINS" ? "contiene" : "=";
  return `${operatorLabel} ${rule.value ?? ""}`.trim();
}

export function buildInventoryLedgerSearchChips(
  snapshot: InventoryLedgerSearchSnapshot,
  searchState?: InventoryLedgerSearchStateResponse | null,
  options?: { skuOptions?: DataTableSearchOption[]; itemLabel?: string },
): InventoryLedgerSearchChip[] {
  const normalized = sanitizeInventoryLedgerSearchSnapshot(snapshot);
  const chips: InventoryLedgerSearchChip[] = [];

  if (normalized.q) {
    chips.push({ id: "q", label: `Busqueda: ${normalized.q}`, removeKey: "q" });
  }

  normalized.filters.forEach((rule) => {
    const label = getInventoryLedgerSearchRuleSummary(normalized, rule.field, searchState, options);
    if (!label) return;
    const fieldLabel = rule.field === InventoryLedgerSearchFields.SKU
      ? options?.itemLabel ?? FIELD_LABELS[rule.field]
      : FIELD_LABELS[rule.field];
    chips.push({
      id: rule.field,
      label: `${fieldLabel}: ${label}`,
      removeKey: rule.field,
    });
  });

  return chips;
}

export function buildInventoryLedgerSmartSearchColumns(
  searchState?: InventoryLedgerSearchStateResponse | null,
  options?: {
    skuOptions?: DataTableSearchOption[];
    onSearchSku?: (query: string) => void;
    itemLabel?: string;
  }
): InventoryLedgerSmartSearchColumn[] {
  return [
    {
      id: InventoryLedgerSearchFields.SKU,
      label: options?.itemLabel ?? "Producto (SKU)",
      kind: "catalog",
      description: "Busca por nombre del SKU o código.",
      operators: IN_OPERATOR,
      options: options?.skuOptions ?? [],
      onSearch: options?.onSearchSku,
    },
    {
      id: InventoryLedgerSearchFields.WAREHOUSE_ID,
      label: "Almacén",
      kind: "catalog",
      description: "Filtra por almacenes.",
      operators: IN_OPERATOR,
      options: searchState?.catalogs.warehouses ?? [],
    },
    {
      id: InventoryLedgerSearchFields.USER_ID,
      label: "Usuario",
      kind: "catalog",
      description: "Filtra por usuario.",
      operators: IN_OPERATOR,
      options: searchState?.catalogs.users ?? [],
    },
    {
      id: InventoryLedgerSearchFields.DIRECTION,
      label: "E/S",
      kind: "catalog",
      description: "Filtra por entradas o salidas.",
      operators: IN_OPERATOR,
      options: searchState?.catalogs.directions ?? [],
    },
  ];
}
