import type {
  DataTableSearchChip,
  DataTableSearchOption,
  SmartSearchFieldConfig,
  SmartSearchOperatorOption,
} from "@/shared/components/table/search";
import type {
  PackSearchField,
  PackSearchOperator,
  PackSearchRule,
  PackSearchSnapshot,
  PackSearchStateResponse,
} from "@/features/catalog/types/packSearch";
import { PackSearchFields, PackSearchOperators } from "@/features/catalog/types/packSearch";

export type PackSearchFilterKey = PackSearchField;
export type PackSearchChip = DataTableSearchChip<PackSearchFilterKey>;
export type PackSmartSearchColumn = SmartSearchFieldConfig<PackSearchFilterKey, PackSearchOperator>;

type PackSearchCatalogs = PackSearchStateResponse["catalogs"];

const TEXT_OPERATORS: SmartSearchOperatorOption<PackSearchOperator>[] = [
  { id: PackSearchOperators.CONTAINS, label: "Contiene" },
  { id: PackSearchOperators.EQ, label: "Es igual a" },
];

const NUMBER_OPERATORS: SmartSearchOperatorOption<PackSearchOperator>[] = [
  { id: PackSearchOperators.EQ, label: "Igual a" },
  { id: PackSearchOperators.GTE, label: "Mayor o igual" },
  { id: PackSearchOperators.LTE, label: "Menor o igual" },
];

const STATUS_FALLBACK: DataTableSearchOption[] = [
  { id: "true", label: "Activo", keywords: ["activo", "habilitado"] },
  { id: "false", label: "Inactivo", keywords: ["inactivo", "deshabilitado"] },
];

const FIELD_LABELS: Record<PackSearchField, string> = {
  [PackSearchFields.IS_ACTIVE]: "Estado",
  [PackSearchFields.DESCRIPTION]: "Descripción",
  [PackSearchFields.TOTAL]: "Total",
};

const OPERATOR_LABELS: Partial<Record<PackSearchOperator, string>> = {
  [PackSearchOperators.IN]: ":",
  [PackSearchOperators.CONTAINS]: "contiene",
  [PackSearchOperators.EQ]: "=",
  [PackSearchOperators.GTE]: ">=",
  [PackSearchOperators.LTE]: "<=",
};

function uniqueStrings(values: string[] | undefined) {
  return Array.from(new Set((values ?? []).map((value) => value?.trim()).filter(Boolean))) as string[];
}

function sanitizeRule(rule?: Partial<PackSearchRule> | null): PackSearchRule | null {
  if (!rule?.field || !rule.operator) return null;

  if (!Object.values(PackSearchFields).includes(rule.field as PackSearchField)) return null;
  if (!Object.values(PackSearchOperators).includes(rule.operator as PackSearchOperator)) return null;

  const field = rule.field as PackSearchField;
  const operator = rule.operator as PackSearchOperator;

  if (field === PackSearchFields.IS_ACTIVE) {
    if (operator !== PackSearchOperators.IN) return null;
    const values = uniqueStrings(rule.values ?? (rule.value ? [rule.value] : undefined));
    const filtered = values.filter((value) => value === "true" || value === "false");
    if (!filtered.length) return null;
    return {
      field,
      operator,
      mode: rule.mode === "exclude" ? "exclude" : "include",
      values: filtered,
    };
  }

  if (field === PackSearchFields.DESCRIPTION) {
    if (operator !== PackSearchOperators.CONTAINS && operator !== PackSearchOperators.EQ) return null;
    const value = rule.value?.trim();
    if (!value) return null;
    return { field, operator, value };
  }

  if (field === PackSearchFields.TOTAL) {
    if (
      operator !== PackSearchOperators.EQ &&
      operator !== PackSearchOperators.GTE &&
      operator !== PackSearchOperators.LTE
    ) {
      return null;
    }
    const value = rule.value?.trim();
    if (!value || Number.isNaN(Number(value))) return null;
    return { field, operator, value };
  }

  return null;
}

export function sanitizePackSearchSnapshot(snapshot?: Partial<PackSearchSnapshot> | null): PackSearchSnapshot {
  const q = typeof snapshot?.q === "string" ? snapshot.q.trim() || undefined : undefined;
  const filtersSource = snapshot && Array.isArray(snapshot.filters) ? snapshot.filters : [];
  const filters = filtersSource
    .map((rule) => sanitizeRule(rule))
    .filter(Boolean) as PackSearchRule[];
  return { q, filters };
}

export function hasPackSearchCriteria(snapshot?: Partial<PackSearchSnapshot> | null) {
  const normalized = sanitizePackSearchSnapshot(snapshot);
  return Boolean(normalized.q || normalized.filters.length);
}

export function serializeFilters(filters: PackSearchRule[]) {
  return JSON.stringify(filters);
}

export function findPackSearchRule(snapshot: PackSearchSnapshot, key: PackSearchFilterKey) {
  return sanitizePackSearchSnapshot(snapshot).filters.find((rule) => rule.field === key) ?? null;
}

export function upsertPackSearchRule(snapshot: PackSearchSnapshot, rule: PackSearchRule) {
  const normalized = sanitizePackSearchSnapshot(snapshot);
  const nextRule = sanitizeRule(rule);
  if (!nextRule) return removePackSearchKey(normalized, rule.field);
  return sanitizePackSearchSnapshot({
    ...normalized,
    filters: [...normalized.filters.filter((item) => item.field !== nextRule.field), nextRule],
  });
}

export function removePackSearchKey(snapshot: PackSearchSnapshot, key: "q" | PackSearchFilterKey) {
  const normalized = sanitizePackSearchSnapshot(snapshot);
  if (key === "q") return sanitizePackSearchSnapshot({ ...normalized, q: undefined });
  return sanitizePackSearchSnapshot({
    ...normalized,
    filters: normalized.filters.filter((rule) => rule.field !== key),
  });
}

function getRuleLabel(rule: PackSearchRule, catalogs?: PackSearchCatalogs | null, includeOperatorLabel = true) {
  const operatorLabel = includeOperatorLabel ? ` ${OPERATOR_LABELS[rule.operator] ?? rule.operator}` : "";
  const fieldLabel = FIELD_LABELS[rule.field] ?? rule.field;

  if (rule.operator === PackSearchOperators.IN) {
    const values = uniqueStrings(rule.values);
    if (!values.length) return null;
    const options = catalogs?.activeStates?.length ? catalogs.activeStates : STATUS_FALLBACK;
    const labels = values.map((value) => options.find((opt) => opt.id === value)?.label ?? value).join(", ");
    const modePrefix = rule.mode === "exclude" ? "No " : "";
    return `${modePrefix}${fieldLabel}${operatorLabel} ${labels}`.trim();
  }

  if (rule.operator === PackSearchOperators.CONTAINS || rule.operator === PackSearchOperators.EQ) {
    const value = rule.value?.trim();
    if (!value) return null;
    return `${fieldLabel}${operatorLabel} ${value}`.trim();
  }

  if (rule.operator === PackSearchOperators.GTE || rule.operator === PackSearchOperators.LTE) {
    const value = rule.value?.trim();
    if (!value) return null;
    return `${fieldLabel}${operatorLabel} ${value}`.trim();
  }

  return null;
}

export function getPackSearchSelectionCount(snapshot: PackSearchSnapshot, key: PackSearchFilterKey) {
  const rule = findPackSearchRule(snapshot, key);
  if (!rule) return 0;
  return rule.operator === PackSearchOperators.IN ? rule.values?.length ?? 0 : 1;
}

export function getPackSearchRuleSummary(snapshot: PackSearchSnapshot, key: PackSearchFilterKey, catalogs?: PackSearchCatalogs | null) {
  const rule = findPackSearchRule(snapshot, key);
  if (!rule) return null;
  return getRuleLabel(rule, catalogs, false);
}

export function buildPackSearchChips(snapshot: PackSearchSnapshot, catalogs?: PackSearchCatalogs | null): PackSearchChip[] {
  const normalized = sanitizePackSearchSnapshot(snapshot);
  const chips: PackSearchChip[] = [];

  if (normalized.q) {
    chips.push({ id: "q", label: `Búsqueda: ${normalized.q}`, removeKey: "q" });
  }

  normalized.filters.forEach((rule) => {
    const label = getRuleLabel(rule, catalogs);
    if (!label) return;
    chips.push({ id: rule.field, label, removeKey: rule.field });
  });

  return chips;
}

export function buildPackSmartSearchColumns(catalogs?: PackSearchCatalogs | null): PackSmartSearchColumn[] {
  return [
    {
      id: PackSearchFields.IS_ACTIVE,
      label: "Estado",
      kind: "catalog",
      description: "Incluye o excluye estados.",
      operators: [{ id: PackSearchOperators.IN, label: "Es alguno de" }],
      supportsExclude: true,
      options: catalogs?.activeStates?.length ? catalogs.activeStates : STATUS_FALLBACK,
    },
    {
      id: PackSearchFields.DESCRIPTION,
      label: "Descripción",
      kind: "text",
      description: "Busca por descripción.",
      operators: TEXT_OPERATORS,
      placeholder: "Ej. Pack familiar",
    },
    {
      id: PackSearchFields.TOTAL,
      label: "Total",
      kind: "number",
      description: "Compara el total del pack.",
      operators: NUMBER_OPERATORS,
      placeholder: "Ej. 35.50",
    },
  ];
}

export function buildPackFiltersFromForm(form: PackSearchSnapshot): PackSearchRule[] {
  return sanitizePackSearchSnapshot(form).filters;
}

export function buildPackSnapshot(form: PackSearchSnapshot): PackSearchSnapshot {
  return sanitizePackSearchSnapshot(form);
}
