import type {
  DataTableSearchChip,
  SmartSearchFieldConfig,
  SmartSearchOperatorOption,
} from "@/shared/components/table/search";
import type {
  SourceSearchCatalogs,
  SourceSearchField,
  SourceSearchOperator,
  SourceSearchRule,
  SourceSearchSnapshot,
} from "@/features/sources/types/sourceSearch";
import { SourceSearchFields, SourceSearchOperators } from "@/features/sources/types/sourceSearch";

export type SourceSearchFilterKey = SourceSearchField;
export type SourceSearchChip = DataTableSearchChip<SourceSearchFilterKey>;
export type SourceSmartSearchColumn = SmartSearchFieldConfig<SourceSearchFilterKey, SourceSearchOperator>;

type SourceSearchOperatorOption = SmartSearchOperatorOption<SourceSearchOperator>;

const CATALOG_FIELDS = new Set<SourceSearchField>([
  SourceSearchFields.IS_ACTIVE,
]);

const TEXT_FIELDS = new Set<SourceSearchField>([
  SourceSearchFields.NAME,
  SourceSearchFields.DETAIL,
]);

const TEXT_OPERATOR_OPTIONS: SourceSearchOperatorOption[] = [
  { id: SourceSearchOperators.CONTAINS, label: "Contiene" },
  { id: SourceSearchOperators.EQ, label: "Es igual a" },
];

const STATUS_OPTIONS = [
  { id: "true", label: "Activos", keywords: ["activo", "habilitado"] },
  { id: "false", label: "Inactivos", keywords: ["inactivo", "deshabilitado"] },
];

const OPERATOR_LABELS: Record<SourceSearchOperator, string> = {
  [SourceSearchOperators.IN]: ":",
  [SourceSearchOperators.CONTAINS]: "contiene",
  [SourceSearchOperators.EQ]: "=",
};

const FIELD_LABELS: Record<SourceSearchField, string> = {
  [SourceSearchFields.NAME]: "Nombre",
  [SourceSearchFields.DETAIL]: "Detalle",
  [SourceSearchFields.IS_ACTIVE]: "Estado",
};

function uniqueStrings(values: string[] | undefined) {
  return Array.from(new Set((values ?? []).map((value) => value?.trim()).filter(Boolean))) as string[];
}

function sanitizeRule(rule?: Partial<SourceSearchRule> | null): SourceSearchRule | null {
  if (!rule?.field || !rule.operator) return null;
  if (!Object.values(SourceSearchFields).includes(rule.field as SourceSearchField)) return null;
  if (!Object.values(SourceSearchOperators).includes(rule.operator as SourceSearchOperator)) return null;

  const field = rule.field as SourceSearchField;
  const operator = rule.operator as SourceSearchOperator;

  if (CATALOG_FIELDS.has(field)) {
    if (operator !== SourceSearchOperators.IN) return null;
    const values = uniqueStrings(rule.values ?? (rule.value ? [rule.value] : undefined));
    if (!values.length) return null;
    return {
      field,
      operator,
      mode: rule.mode === "exclude" ? "exclude" : "include",
      values,
    };
  }

  if (TEXT_FIELDS.has(field)) {
    if (operator !== SourceSearchOperators.CONTAINS && operator !== SourceSearchOperators.EQ) return null;
    const value = rule.value?.trim();
    if (!value) return null;
    return { field, operator, value };
  }

  return null;
}

export function sanitizeSourceSearchSnapshot(snapshot?: Partial<SourceSearchSnapshot> | null): SourceSearchSnapshot {
  const q = typeof snapshot?.q === "string" ? snapshot.q.trim() || undefined : undefined;
  const filtersSource = snapshot && Array.isArray(snapshot.filters) ? snapshot.filters : [];
  const filters = filtersSource
    .map((rule) => sanitizeRule(rule))
    .filter(Boolean) as SourceSearchRule[];
  return { q, filters };
}

export function findSourceSearchRule(snapshot: SourceSearchSnapshot, key: SourceSearchFilterKey) {
  const normalized = sanitizeSourceSearchSnapshot(snapshot);
  return normalized.filters.find((rule) => rule.field === key) ?? null;
}

function getCatalogMaps(catalogs?: SourceSearchCatalogs | null) {
  return {
    active: new Map((catalogs?.activeStates ?? STATUS_OPTIONS).map((item) => [item.id, item.label])),
  };
}

function getCatalogLabels(field: SourceSearchField, values: string[], catalogs?: SourceSearchCatalogs | null) {
  const maps = getCatalogMaps(catalogs);
  const map = field === SourceSearchFields.IS_ACTIVE ? maps.active : null;
  if (!map) return values;
  return values.map((value) => map.get(value) ?? value);
}

function getRuleLabel(rule: SourceSearchRule, catalogs?: SourceSearchCatalogs | null, includeOperatorLabel = true) {
  const operatorLabel = includeOperatorLabel ? ` ${OPERATOR_LABELS[rule.operator]}` : "";
  const fieldLabel = FIELD_LABELS[rule.field] ?? rule.field;

  if (rule.operator === SourceSearchOperators.IN) {
    const values = uniqueStrings(rule.values);
    if (!values.length) return null;
    const labels = getCatalogLabels(rule.field, values, catalogs).join(", ");
    const modePrefix = rule.mode === "exclude" ? "No " : "";
    return `${modePrefix}${fieldLabel}${operatorLabel} ${labels}`.trim();
  }

  if (rule.operator === SourceSearchOperators.CONTAINS || rule.operator === SourceSearchOperators.EQ) {
    const value = rule.value?.trim();
    if (!value) return null;
    return `${fieldLabel}${operatorLabel} ${value}`.trim();
  }

  return null;
}

export function getSourceSearchSelectionCount(snapshot: SourceSearchSnapshot, key: SourceSearchFilterKey) {
  const rule = findSourceSearchRule(snapshot, key);
  if (!rule) return 0;
  return rule.operator === SourceSearchOperators.IN ? rule.values?.length ?? 0 : 1;
}

export function getSourceSearchRuleSummary(snapshot: SourceSearchSnapshot, key: SourceSearchFilterKey, catalogs?: SourceSearchCatalogs | null) {
  const rule = findSourceSearchRule(snapshot, key);
  if (!rule) return null;
  return getRuleLabel(rule, catalogs, false);
}

export function buildSourceSearchChips(snapshot: SourceSearchSnapshot, catalogs?: SourceSearchCatalogs | null): SourceSearchChip[] {
  const normalized = sanitizeSourceSearchSnapshot(snapshot);
  const chips: SourceSearchChip[] = [];

  if (normalized.q) {
    chips.push({ id: "q", label: `Busqueda: ${normalized.q}`, removeKey: "q" });
  }

  normalized.filters.forEach((rule) => {
    const label = getRuleLabel(rule, catalogs);
    if (!label) return;
    chips.push({ id: rule.field, label, removeKey: rule.field });
  });

  return chips;
}

export function applySourceSearchRule(snapshot: SourceSearchSnapshot, rule: SourceSearchRule): SourceSearchSnapshot {
  const normalized = sanitizeSourceSearchSnapshot(snapshot);
  const nextFilters = normalized.filters.filter((item) => item.field !== rule.field);
  nextFilters.push(rule);
  return sanitizeSourceSearchSnapshot({ ...normalized, filters: nextFilters });
}

export function removeSourceSearchKey(snapshot: SourceSearchSnapshot, key: "q" | SourceSearchFilterKey): SourceSearchSnapshot {
  const normalized = sanitizeSourceSearchSnapshot(snapshot);
  if (key === "q") return sanitizeSourceSearchSnapshot({ ...normalized, q: undefined });
  return sanitizeSourceSearchSnapshot({
    ...normalized,
    filters: normalized.filters.filter((rule) => rule.field !== key),
  });
}

export function buildSourceSmartSearchColumns(catalogs?: SourceSearchCatalogs | null): SourceSmartSearchColumn[] {
  return [
    {
      id: SourceSearchFields.NAME,
      label: "Nombre",
      kind: "text",
      description: "Busca por nombre.",
      operators: TEXT_OPERATOR_OPTIONS,
      placeholder: "Ej. Facebook Ads",
    },
    {
      id: SourceSearchFields.DETAIL,
      label: "Detalle",
      kind: "text",
      description: "Busca por detalle.",
      operators: TEXT_OPERATOR_OPTIONS,
      placeholder: "Ej. Campaña 2026 Q2",
    },
    {
      id: SourceSearchFields.IS_ACTIVE,
      label: "Estado",
      kind: "catalog",
      description: "Filtra por estado.",
      operators: [{ id: SourceSearchOperators.IN, label: "Es alguno de" }],
      supportsExclude: true,
      options: catalogs?.activeStates ?? STATUS_OPTIONS,
    },
  ];
}
