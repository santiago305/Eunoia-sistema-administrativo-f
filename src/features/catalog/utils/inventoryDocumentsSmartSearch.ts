import type {
  DataTableSearchChip,
  SmartSearchFieldConfig,
  SmartSearchOperatorOption,
  SmartSearchRule,
} from "@/shared/components/table/search";
import type {
  InventoryDocumentsSearchField,
  InventoryDocumentsSearchOperator,
  InventoryDocumentsSearchSnapshot,
  InventoryDocumentsSearchStateResponse,
} from "@/features/catalog/types/inventoryDocumentsSearch";
import type { DocType } from "@/features/warehouse/types/warehouse";
import { InventoryDocumentsSearchFields } from "@/features/catalog/types/inventoryDocumentsSearch";

export type InventoryDocumentsSearchFilterKey = InventoryDocumentsSearchField;

export type InventoryDocumentsSearchRule = SmartSearchRule<
  InventoryDocumentsSearchField,
  InventoryDocumentsSearchOperator
>;

export type InventoryDocumentsSearchChip = DataTableSearchChip<InventoryDocumentsSearchFilterKey>;

export type InventoryDocumentsSmartSearchColumn = SmartSearchFieldConfig<
  InventoryDocumentsSearchFilterKey,
  InventoryDocumentsSearchOperator
>;

type OperatorOption = SmartSearchOperatorOption<InventoryDocumentsSearchOperator>;

const FIELD_ORDER: InventoryDocumentsSearchField[] = [
  InventoryDocumentsSearchFields.WAREHOUSE_ID,
  InventoryDocumentsSearchFields.FROM_WAREHOUSE_ID,
  InventoryDocumentsSearchFields.TO_WAREHOUSE_ID,
  InventoryDocumentsSearchFields.CREATED_BY_ID,
  InventoryDocumentsSearchFields.STATUS,
];

const FIELD_LABELS: Record<InventoryDocumentsSearchField, string> = {
  [InventoryDocumentsSearchFields.WAREHOUSE_ID]: "Almacén",
  [InventoryDocumentsSearchFields.FROM_WAREHOUSE_ID]: "Origen",
  [InventoryDocumentsSearchFields.TO_WAREHOUSE_ID]: "Destino",
  [InventoryDocumentsSearchFields.CREATED_BY_ID]: "Usuario",
  [InventoryDocumentsSearchFields.STATUS]: "Estado",
};

const IN_OPERATOR: OperatorOption[] = [{ id: "IN", label: "Es alguno de" }];

type InventoryDocumentsSearchMode = "default" | "adjustment" | "transfer";

function resolveModeFromDocType(docType?: DocType) {
  if (docType === "ADJUSTMENT") return "adjustment";
  if (docType === "TRANSFER") return "transfer";
  return "default";
}

function allowedFieldsByMode(mode: InventoryDocumentsSearchMode) {
  if (mode === "adjustment") {
    return new Set<InventoryDocumentsSearchField>([
      InventoryDocumentsSearchFields.WAREHOUSE_ID,
      InventoryDocumentsSearchFields.CREATED_BY_ID,
      InventoryDocumentsSearchFields.STATUS,
    ]);
  }

  if (mode === "transfer") {
    return new Set<InventoryDocumentsSearchField>([
      InventoryDocumentsSearchFields.FROM_WAREHOUSE_ID,
      InventoryDocumentsSearchFields.TO_WAREHOUSE_ID,
      InventoryDocumentsSearchFields.CREATED_BY_ID,
      InventoryDocumentsSearchFields.STATUS,
    ]);
  }

  return new Set(FIELD_ORDER);
}

function uniqueStrings(values: string[] | undefined) {
  return Array.from(new Set((values ?? []).map((value) => value?.trim()).filter(Boolean))) as string[];
}

function allowedStatusIds(searchState?: InventoryDocumentsSearchStateResponse | null) {
  const ids = (searchState?.catalogs.statuses ?? []).map((option) => option.id);
  return new Set(ids.length ? ids : ["DRAFT", "POSTED", "CANCELLED"]);
}

function sanitizeRule(
  rule?: Partial<InventoryDocumentsSearchRule> | null,
  searchState?: InventoryDocumentsSearchStateResponse | null,
  mode: InventoryDocumentsSearchMode = "default",
): InventoryDocumentsSearchRule | null {
  if (!rule?.field || !rule.operator) return null;
  if (!FIELD_ORDER.includes(rule.field)) return null;
  if (!allowedFieldsByMode(mode).has(rule.field)) return null;
  if (rule.operator !== "IN") return null;

  const values = uniqueStrings(rule.values ?? (rule.value ? [rule.value] : undefined));
  if (!values.length) return null;

  if (rule.field === InventoryDocumentsSearchFields.STATUS) {
    const allowed = allowedStatusIds(searchState);
    const normalized = values.filter((value) => allowed.has(value));
    if (!normalized.length) return null;
    return { field: rule.field, operator: "IN", values: normalized };
  }

  return { field: rule.field, operator: "IN", values };
}

export function createEmptyInventoryDocumentsSearchFilters(): InventoryDocumentsSearchRule[] {
  return [];
}

export function sanitizeInventoryDocumentsSearchSnapshot(
  snapshot?: Partial<InventoryDocumentsSearchSnapshot> | { q?: string; filters?: unknown } | null,
  searchState?: InventoryDocumentsSearchStateResponse | null,
  options?: { mode?: InventoryDocumentsSearchMode; docType?: DocType },
): InventoryDocumentsSearchSnapshot {
  const mode = options?.mode ?? resolveModeFromDocType(options?.docType);
  const q = snapshot?.q?.trim();
  const rawFilters = Array.isArray(snapshot?.filters) ? snapshot.filters : [];
  const merged = new Map<InventoryDocumentsSearchField, InventoryDocumentsSearchRule>();

  rawFilters.forEach((rule) => {
    const normalized = sanitizeRule(rule as InventoryDocumentsSearchRule, searchState, mode);
    if (!normalized) return;

    const existing = merged.get(normalized.field);
    if (existing?.operator === "IN") {
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
    filters: FIELD_ORDER
      .filter((field) => allowedFieldsByMode(mode).has(field))
      .map((field) => merged.get(field))
      .filter(Boolean) as InventoryDocumentsSearchRule[],
  };
}

export function hasInventoryDocumentsSearchCriteria(snapshot?: Partial<InventoryDocumentsSearchSnapshot> | null) {
  const normalized = sanitizeInventoryDocumentsSearchSnapshot(snapshot);
  return Boolean(normalized.q || normalized.filters.length);
}

export function findInventoryDocumentsSearchRule(snapshot: InventoryDocumentsSearchSnapshot, key: InventoryDocumentsSearchFilterKey) {
  return sanitizeInventoryDocumentsSearchSnapshot(snapshot).filters.find((rule) => rule.field === key) ?? null;
}

export function upsertInventoryDocumentsSearchRule(
  snapshot: InventoryDocumentsSearchSnapshot,
  rule: InventoryDocumentsSearchRule,
  searchState?: InventoryDocumentsSearchStateResponse | null,
  options?: { mode?: InventoryDocumentsSearchMode; docType?: DocType },
) {
  const normalized = sanitizeInventoryDocumentsSearchSnapshot(snapshot, searchState, options);
  const mode = options?.mode ?? resolveModeFromDocType(options?.docType);
  const nextRule = sanitizeRule(rule, searchState, mode);

  if (!nextRule) {
    return removeInventoryDocumentsSearchKey(normalized, rule.field);
  }

  return sanitizeInventoryDocumentsSearchSnapshot(
    {
      ...normalized,
      filters: [...normalized.filters.filter((item) => item.field !== nextRule.field), nextRule],
    },
    searchState,
    options,
  );
}

export function removeInventoryDocumentsSearchKey(snapshot: InventoryDocumentsSearchSnapshot, key: "q" | InventoryDocumentsSearchFilterKey) {
  const normalized = sanitizeInventoryDocumentsSearchSnapshot(snapshot);
  if (key === "q") return sanitizeInventoryDocumentsSearchSnapshot({ ...normalized, q: undefined });

  return sanitizeInventoryDocumentsSearchSnapshot({
    ...normalized,
    filters: normalized.filters.filter((rule) => rule.field !== key),
  });
}

export function getInventoryDocumentsSearchSelectionCount(snapshot: InventoryDocumentsSearchSnapshot, key: InventoryDocumentsSearchFilterKey) {
  const rule = findInventoryDocumentsSearchRule(snapshot, key);
  if (!rule) return 0;
  return rule.values?.length ?? 0;
}

export function getInventoryDocumentsSearchRuleSummary(
  snapshot: InventoryDocumentsSearchSnapshot,
  key: InventoryDocumentsSearchFilterKey,
  searchState?: InventoryDocumentsSearchStateResponse | null,
) {
  const rule = findInventoryDocumentsSearchRule(snapshot, key);
  if (!rule) return null;

  if (rule.operator !== "IN") return null;

  const values = rule.values ?? [];
  if (!values.length) return null;

  const options =
    key === InventoryDocumentsSearchFields.WAREHOUSE_ID
      ? searchState?.catalogs.warehouses
      : key === InventoryDocumentsSearchFields.FROM_WAREHOUSE_ID
      ? searchState?.catalogs.warehouses
      : key === InventoryDocumentsSearchFields.TO_WAREHOUSE_ID
      ? searchState?.catalogs.warehouses
      : key === InventoryDocumentsSearchFields.CREATED_BY_ID
      ? searchState?.catalogs.users
      : searchState?.catalogs.statuses;
  const map = new Map((options ?? []).map((option) => [option.id, option.label]));
  return values.map((value) => map.get(value) ?? value).join(" - ");
}

export function buildInventoryDocumentsSearchChips(
  snapshot: InventoryDocumentsSearchSnapshot,
  searchState?: InventoryDocumentsSearchStateResponse | null,
  options?: { mode?: InventoryDocumentsSearchMode; docType?: DocType },
): InventoryDocumentsSearchChip[] {
  const normalized = sanitizeInventoryDocumentsSearchSnapshot(snapshot, searchState, options);
  const chips: InventoryDocumentsSearchChip[] = [];

  if (normalized.q) {
    chips.push({ id: "q", label: `Busqueda: ${normalized.q}`, removeKey: "q" });
  }

  normalized.filters.forEach((rule) => {
    const label = getInventoryDocumentsSearchRuleSummary(normalized, rule.field, searchState);
    if (!label) return;
    chips.push({
      id: rule.field,
      label: `${FIELD_LABELS[rule.field]}: ${label}`,
      removeKey: rule.field,
    });
  });

  return chips;
}

export function buildInventoryDocumentsSmartSearchColumns(
  searchState?: InventoryDocumentsSearchStateResponse | null,
  options?: { mode?: InventoryDocumentsSearchMode; docType?: DocType },
): InventoryDocumentsSmartSearchColumn[] {
  const mode = options?.mode ?? resolveModeFromDocType(options?.docType);
  const allowed = allowedFieldsByMode(mode);

  const allColumns: InventoryDocumentsSmartSearchColumn[] = [
    {
      id: InventoryDocumentsSearchFields.WAREHOUSE_ID,
      label: "Almacén",
      kind: "catalog",
      description: "Filtra por almacenes involucrados (origen o destino).",
      operators: IN_OPERATOR,
      options: searchState?.catalogs.warehouses ?? [],
    },
    {
      id: InventoryDocumentsSearchFields.FROM_WAREHOUSE_ID,
      label: "Origen",
      kind: "catalog",
      description: "Filtra por almacén de origen.",
      operators: IN_OPERATOR,
      options: searchState?.catalogs.warehouses ?? [],
    },
    {
      id: InventoryDocumentsSearchFields.TO_WAREHOUSE_ID,
      label: "Destino",
      kind: "catalog",
      description: "Filtra por almacén de destino.",
      operators: IN_OPERATOR,
      options: searchState?.catalogs.warehouses ?? [],
    },
    {
      id: InventoryDocumentsSearchFields.CREATED_BY_ID,
      label: "Usuario",
      kind: "catalog",
      description: "Filtra por usuario que creó el documento.",
      operators: IN_OPERATOR,
      options: searchState?.catalogs.users ?? [],
    },
    {
      id: InventoryDocumentsSearchFields.STATUS,
      label: "Estado",
      kind: "catalog",
      description: "Filtra por estado del documento.",
      operators: IN_OPERATOR,
      options: searchState?.catalogs.statuses ?? [],
    },
  ];

  return allColumns.filter((column) => allowed.has(column.id));
}
