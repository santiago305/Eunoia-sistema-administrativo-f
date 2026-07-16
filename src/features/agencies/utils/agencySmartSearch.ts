import type {
  DataTableSearchChip,
  SmartSearchFieldConfig,
  SmartSearchOperatorOption,
} from "@/shared/components/table/search";
import type {
  AgencySearchCatalogs,
  AgencySearchField,
  AgencySearchOperator,
  AgencySearchRule,
  AgencySearchSnapshot,
} from "@/features/agencies/types/agencySearch";
import {
  AgencySearchFields,
  AgencySearchOperators,
} from "@/features/agencies/types/agencySearch";

export type AgencySearchFilterKey = AgencySearchField;
export type AgencySearchChip = DataTableSearchChip<AgencySearchFilterKey>;
export type AgencySmartSearchColumn = SmartSearchFieldConfig<
  AgencySearchFilterKey,
  AgencySearchOperator
>;

type AgencySearchOperatorOption = SmartSearchOperatorOption<AgencySearchOperator>;

const CATALOG_FIELDS = new Set<AgencySearchField>([
  AgencySearchFields.DEPARTMENT_ID,
  AgencySearchFields.PROVINCE_ID,
  AgencySearchFields.DISTRICT_ID,
]);

const TEXT_FIELDS = new Set<AgencySearchField>([
  AgencySearchFields.NAME,
  AgencySearchFields.ALIAS,
  AgencySearchFields.ADDRESS,
]);

const TEXT_OPERATOR_OPTIONS: AgencySearchOperatorOption[] = [
  { id: AgencySearchOperators.CONTAINS, label: "Contiene" },
  { id: AgencySearchOperators.EQ, label: "Es igual a" },
];

const OPERATOR_LABELS: Record<AgencySearchOperator, string> = {
  [AgencySearchOperators.IN]: ":",
  [AgencySearchOperators.CONTAINS]: "contiene",
  [AgencySearchOperators.EQ]: "=",
};

const FIELD_LABELS: Partial<Record<AgencySearchField, string>> = {
  [AgencySearchFields.NAME]: "Nombre",
  [AgencySearchFields.ALIAS]: "Alias",
  [AgencySearchFields.ADDRESS]: "Direccion",
  [AgencySearchFields.DEPARTMENT_ID]: "Departamento",
  [AgencySearchFields.PROVINCE_ID]: "Provincia",
  [AgencySearchFields.DISTRICT_ID]: "Distrito",
};

function uniqueStrings(values: string[] | undefined) {
  return Array.from(new Set((values ?? []).map((value) => value?.trim()).filter(Boolean))) as string[];
}

function sanitizeRule(rule?: Partial<AgencySearchRule> | null): AgencySearchRule | null {
  if (!rule?.field || !rule.operator) return null;
  if (!Object.values(AgencySearchFields).includes(rule.field as AgencySearchField)) return null;
  if (!Object.values(AgencySearchOperators).includes(rule.operator as AgencySearchOperator)) return null;

  const field = rule.field as AgencySearchField;
  const operator = rule.operator as AgencySearchOperator;

  if (CATALOG_FIELDS.has(field)) {
    if (operator !== AgencySearchOperators.IN) return null;
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
    if (operator !== AgencySearchOperators.CONTAINS && operator !== AgencySearchOperators.EQ) return null;
    const value = rule.value?.trim();
    if (!value) return null;
    return { field, operator, value };
  }

  return null;
}

export function sanitizeAgencySearchSnapshot(snapshot?: Partial<AgencySearchSnapshot> | null): AgencySearchSnapshot {
  const q = typeof snapshot?.q === "string" ? snapshot.q.trim() || undefined : undefined;
  const filtersSource = snapshot && Array.isArray(snapshot.filters) ? snapshot.filters : [];
  const filters = filtersSource
    .map((rule) => sanitizeRule(rule))
    .filter(Boolean) as AgencySearchRule[];
  return { q, filters };
}

export function findAgencySearchRule(snapshot: AgencySearchSnapshot, key: AgencySearchFilterKey) {
  const normalized = sanitizeAgencySearchSnapshot(snapshot);
  return normalized.filters.find((rule) => rule.field === key) ?? null;
}

function upsertAgencySearchRule(snapshot: AgencySearchSnapshot, rule: AgencySearchRule) {
  const normalized = sanitizeAgencySearchSnapshot(snapshot);
  const nextFilters = normalized.filters.filter((item) => item.field !== rule.field);
  nextFilters.push(rule);
  return sanitizeAgencySearchSnapshot({ ...normalized, filters: nextFilters });
}

function removeAgencySearchKey(snapshot: AgencySearchSnapshot, key: "q" | AgencySearchFilterKey) {
  const normalized = sanitizeAgencySearchSnapshot(snapshot);
  if (key === "q") return sanitizeAgencySearchSnapshot({ ...normalized, q: undefined });
  return sanitizeAgencySearchSnapshot({
    ...normalized,
    filters: normalized.filters.filter((rule) => rule.field !== key),
  });
}

function getCatalogMaps(catalogs?: AgencySearchCatalogs | null) {
  return {
    department: new Map((catalogs?.departments ?? []).map((item) => [item.id, item.label])),
    province: new Map((catalogs?.provinces ?? []).map((item) => [item.id, item.label])),
    district: new Map((catalogs?.districts ?? []).map((item) => [item.id, item.label])),
  };
}

function getCatalogLabels(field: AgencySearchField, values: string[], catalogs?: AgencySearchCatalogs | null) {
  const maps = getCatalogMaps(catalogs);
  const map =
    field === AgencySearchFields.DEPARTMENT_ID
      ? maps.department
      : field === AgencySearchFields.PROVINCE_ID
        ? maps.province
        : field === AgencySearchFields.DISTRICT_ID
          ? maps.district
          : null;

  if (!map) return values;
  return values.map((value) => map.get(value) ?? value);
}

function getRuleLabel(rule: AgencySearchRule, catalogs?: AgencySearchCatalogs | null, includeOperatorLabel = true) {
  const operatorLabel = includeOperatorLabel ? ` ${OPERATOR_LABELS[rule.operator]}` : "";
  const fieldLabel = FIELD_LABELS[rule.field] ?? rule.field;

  if (rule.operator === AgencySearchOperators.IN) {
    const values = uniqueStrings(rule.values);
    if (!values.length) return null;
    const labels = getCatalogLabels(rule.field, values, catalogs).join(", ");
    const modePrefix = rule.mode === "exclude" ? "No " : "";
    return `${modePrefix}${fieldLabel}${operatorLabel} ${labels}`.trim();
  }

  if (rule.operator === AgencySearchOperators.CONTAINS || rule.operator === AgencySearchOperators.EQ) {
    const value = rule.value?.trim();
    if (!value) return null;
    return `${fieldLabel}${operatorLabel} ${value}`.trim();
  }

  return null;
}

export function getAgencySearchSelectionCount(snapshot: AgencySearchSnapshot, key: AgencySearchFilterKey) {
  const rule = findAgencySearchRule(snapshot, key);
  if (!rule) return 0;
  return rule.operator === AgencySearchOperators.IN ? rule.values?.length ?? 0 : 1;
}

export function getAgencySearchRuleSummary(snapshot: AgencySearchSnapshot, key: AgencySearchFilterKey, catalogs?: AgencySearchCatalogs | null) {
  const rule = findAgencySearchRule(snapshot, key);
  if (!rule) return null;
  return getRuleLabel(rule, catalogs, false);
}

export function buildAgencySearchChips(snapshot: AgencySearchSnapshot, catalogs?: AgencySearchCatalogs | null): AgencySearchChip[] {
  const normalized = sanitizeAgencySearchSnapshot(snapshot);
  const chips: AgencySearchChip[] = [];

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

export function buildAgencySmartSearchColumns(catalogs?: AgencySearchCatalogs | null): AgencySmartSearchColumn[] {
  return [
    {
      id: AgencySearchFields.NAME,
      label: "Nombre",
      kind: "text",
      description: "Busca por nombre.",
      operators: TEXT_OPERATOR_OPTIONS,
      placeholder: "Ej. Lima Centro",
    },
    {
      id: AgencySearchFields.ALIAS,
      label: "Alias",
      kind: "text",
      description: "Busca por alias de sucursal.",
      operators: TEXT_OPERATOR_OPTIONS,
      placeholder: "Ej. Lima Centro",
    },
    {
      id: AgencySearchFields.ADDRESS,
      label: "Direccion",
      kind: "text",
      description: "Busca por direccion.",
      operators: TEXT_OPERATOR_OPTIONS,
      placeholder: "Ej. Av. Principal 123",
    },
    {
      id: AgencySearchFields.DEPARTMENT_ID,
      label: "Departamento",
      kind: "catalog",
      description: "Filtra por departamento.",
      operators: [{ id: AgencySearchOperators.IN, label: "Es alguno de" }],
      supportsExclude: true,
      options: catalogs?.departments ?? [],
    },
    {
      id: AgencySearchFields.PROVINCE_ID,
      label: "Provincia",
      kind: "catalog",
      description: "Filtra por provincia.",
      operators: [{ id: AgencySearchOperators.IN, label: "Es alguno de" }],
      supportsExclude: true,
      options: catalogs?.provinces ?? [],
    },
    {
      id: AgencySearchFields.DISTRICT_ID,
      label: "Distrito",
      kind: "catalog",
      description: "Filtra por distrito.",
      operators: [{ id: AgencySearchOperators.IN, label: "Es alguno de" }],
      supportsExclude: true,
      options: catalogs?.districts ?? [],
    },
  ];
}

export function applyAgencySearchRuleWithDependencies(snapshot: AgencySearchSnapshot, rule: AgencySearchRule) {
  let nextSnapshot = upsertAgencySearchRule(snapshot, rule);

  if (rule.field === AgencySearchFields.DEPARTMENT_ID) {
    nextSnapshot = removeAgencySearchKey(nextSnapshot, AgencySearchFields.PROVINCE_ID);
    nextSnapshot = removeAgencySearchKey(nextSnapshot, AgencySearchFields.DISTRICT_ID);
  }

  if (rule.field === AgencySearchFields.PROVINCE_ID) {
    nextSnapshot = removeAgencySearchKey(nextSnapshot, AgencySearchFields.DISTRICT_ID);
  }

  return nextSnapshot;
}

export function removeAgencySearchKeyWithDependencies(snapshot: AgencySearchSnapshot, key: "q" | AgencySearchFilterKey) {
  let nextSnapshot = removeAgencySearchKey(snapshot, key);

  if (key === AgencySearchFields.DEPARTMENT_ID) {
    nextSnapshot = removeAgencySearchKey(nextSnapshot, AgencySearchFields.PROVINCE_ID);
    nextSnapshot = removeAgencySearchKey(nextSnapshot, AgencySearchFields.DISTRICT_ID);
  }

  if (key === AgencySearchFields.PROVINCE_ID) {
    nextSnapshot = removeAgencySearchKey(nextSnapshot, AgencySearchFields.DISTRICT_ID);
  }

  return nextSnapshot;
}
