import type {
  DataTableSearchChip,
  SmartSearchFieldConfig,
  SmartSearchOperatorOption,
} from "@/shared/components/table/search";
import type {
  ClientSearchCatalogs,
  ClientSearchField,
  ClientSearchFilters,
  ClientSearchOperator,
  ClientSearchRule,
  ClientSearchSnapshot,
} from "@/features/clients/types/clientSearch";
import {
  ClientSearchFields,
  ClientSearchOperators,
} from "@/features/clients/types/clientSearch";

export type ClientSearchFilterKey = ClientSearchField;
export type ClientSearchChip = DataTableSearchChip<ClientSearchFilterKey>;
export type ClientSmartSearchColumn = SmartSearchFieldConfig<ClientSearchFilterKey, ClientSearchOperator>;

type ClientSearchOperatorOption = SmartSearchOperatorOption<ClientSearchOperator>;

const CATALOG_FIELDS = new Set<ClientSearchField>([
  ClientSearchFields.TYPE,
  ClientSearchFields.DOC_TYPE,
  ClientSearchFields.DEPARTMENT_ID,
  ClientSearchFields.PROVINCE_ID,
  ClientSearchFields.DISTRICT_ID,
  ClientSearchFields.IS_ACTIVE,
]);

const TEXT_FIELDS = new Set<ClientSearchField>([
  ClientSearchFields.FULL_NAME,
  ClientSearchFields.DOC_NUMBER,
  ClientSearchFields.ADDRESS,
  ClientSearchFields.REFERENCE,
]);

const TEXT_OPERATOR_OPTIONS: ClientSearchOperatorOption[] = [
  { id: ClientSearchOperators.CONTAINS, label: "Contiene" },
  { id: ClientSearchOperators.EQ, label: "Es igual a" },
];

const STATUS_OPTIONS = [
  { id: "true", label: "Activos", keywords: ["activo", "habilitado"] },
  { id: "false", label: "Inactivos", keywords: ["inactivo", "deshabilitado"] },
];

const OPERATOR_LABELS: Record<ClientSearchOperator, string> = {
  [ClientSearchOperators.IN]: ":",
  [ClientSearchOperators.CONTAINS]: "contiene",
  [ClientSearchOperators.EQ]: "=",
};

const FIELD_LABELS: Record<ClientSearchField, string> = {
  [ClientSearchFields.FULL_NAME]: "Nombre",
  [ClientSearchFields.DOC_NUMBER]: "Documento",
  [ClientSearchFields.ADDRESS]: "Dirección",
  [ClientSearchFields.REFERENCE]: "Referencia",
  [ClientSearchFields.TYPE]: "Tipo",
  [ClientSearchFields.DOC_TYPE]: "Tipo doc",
  [ClientSearchFields.DEPARTMENT_ID]: "Departamento",
  [ClientSearchFields.PROVINCE_ID]: "Provincia",
  [ClientSearchFields.DISTRICT_ID]: "Distrito",
  [ClientSearchFields.IS_ACTIVE]: "Estado",
};

function uniqueStrings(values: string[] | undefined) {
  return Array.from(
    new Set((values ?? []).map((value) => value?.trim()).filter(Boolean)),
  ) as string[];
}

function sanitizeRule(rule?: Partial<ClientSearchRule> | null): ClientSearchRule | null {
  if (!rule?.field || !rule.operator) return null;
  if (!Object.values(ClientSearchFields).includes(rule.field as ClientSearchField)) return null;
  if (!Object.values(ClientSearchOperators).includes(rule.operator as ClientSearchOperator)) return null;

  const field = rule.field as ClientSearchField;
  const operator = rule.operator as ClientSearchOperator;

  if (CATALOG_FIELDS.has(field)) {
    if (operator !== ClientSearchOperators.IN) return null;
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
    if (operator !== ClientSearchOperators.CONTAINS && operator !== ClientSearchOperators.EQ) return null;
    const value = rule.value?.trim();
    if (!value) return null;
    return { field, operator, value };
  }

  return null;
}

export function sanitizeClientSearchSnapshot(snapshot?: Partial<ClientSearchSnapshot> | null): ClientSearchSnapshot {
  const q = typeof snapshot?.q === "string" ? snapshot.q.trim() || undefined : undefined;
  const filtersSource = snapshot && Array.isArray(snapshot.filters) ? snapshot.filters : [];
  const filters = filtersSource
    .map((rule) => sanitizeRule(rule))
    .filter(Boolean) as ClientSearchFilters;
  return { q, filters };
}

export function findClientSearchRule(snapshot: ClientSearchSnapshot, key: ClientSearchFilterKey) {
  const normalized = sanitizeClientSearchSnapshot(snapshot);
  return normalized.filters.find((rule) => rule.field === key) ?? null;
}

function upsertClientSearchRule(snapshot: ClientSearchSnapshot, rule: ClientSearchRule) {
  const normalized = sanitizeClientSearchSnapshot(snapshot);
  const nextFilters = normalized.filters.filter((item) => item.field !== rule.field);
  nextFilters.push(rule);
  return sanitizeClientSearchSnapshot({ ...normalized, filters: nextFilters });
}

function removeClientSearchKey(snapshot: ClientSearchSnapshot, key: "q" | ClientSearchFilterKey) {
  const normalized = sanitizeClientSearchSnapshot(snapshot);
  if (key === "q") return sanitizeClientSearchSnapshot({ ...normalized, q: undefined });
  return sanitizeClientSearchSnapshot({
    ...normalized,
    filters: normalized.filters.filter((rule) => rule.field !== key),
  });
}

function getCatalogMaps(catalogs?: ClientSearchCatalogs | null) {
  return {
    active: new Map((catalogs?.activeStates ?? STATUS_OPTIONS).map((item) => [item.id, item.label])),
    docType: new Map((catalogs?.docTypes ?? []).map((item) => [item.id, item.label])),
    clientType: new Map((catalogs?.clientTypes ?? []).map((item) => [item.id, item.label])),
    department: new Map((catalogs?.departments ?? []).map((item) => [item.id, item.label])),
    province: new Map((catalogs?.provinces ?? []).map((item) => [item.id, item.label])),
    district: new Map((catalogs?.districts ?? []).map((item) => [item.id, item.label])),
  };
}

function getCatalogLabels(field: ClientSearchField, values: string[], catalogs?: ClientSearchCatalogs | null) {
  const maps = getCatalogMaps(catalogs);
  const map =
    field === ClientSearchFields.IS_ACTIVE
      ? maps.active
      : field === ClientSearchFields.DOC_TYPE
        ? maps.docType
        : field === ClientSearchFields.TYPE
          ? maps.clientType
          : field === ClientSearchFields.DEPARTMENT_ID
            ? maps.department
            : field === ClientSearchFields.PROVINCE_ID
              ? maps.province
              : field === ClientSearchFields.DISTRICT_ID
                ? maps.district
                : null;

  if (!map) return values;
  return values.map((value) => map.get(value) ?? value);
}

function getRuleLabel(rule: ClientSearchRule, catalogs?: ClientSearchCatalogs | null, includeOperatorLabel = true) {
  const operatorLabel = includeOperatorLabel ? ` ${OPERATOR_LABELS[rule.operator]}` : "";
  const fieldLabel = FIELD_LABELS[rule.field] ?? rule.field;

  if (rule.operator === ClientSearchOperators.IN) {
    const values = uniqueStrings(rule.values);
    if (!values.length) return null;
    const labels = getCatalogLabels(rule.field, values, catalogs).join(", ");
    const modePrefix = rule.mode === "exclude" ? "No " : "";
    return `${modePrefix}${fieldLabel}${operatorLabel} ${labels}`.trim();
  }

  if (rule.operator === ClientSearchOperators.CONTAINS || rule.operator === ClientSearchOperators.EQ) {
    const value = rule.value?.trim();
    if (!value) return null;
    return `${fieldLabel}${operatorLabel} ${value}`.trim();
  }

  return null;
}

export function getClientSearchSelectionCount(snapshot: ClientSearchSnapshot, key: ClientSearchFilterKey) {
  const rule = findClientSearchRule(snapshot, key);
  if (!rule) return 0;
  return rule.operator === ClientSearchOperators.IN ? rule.values?.length ?? 0 : 1;
}

export function getClientSearchRuleSummary(snapshot: ClientSearchSnapshot, key: ClientSearchFilterKey, catalogs?: ClientSearchCatalogs | null) {
  const rule = findClientSearchRule(snapshot, key);
  if (!rule) return null;
  return getRuleLabel(rule, catalogs, false);
}

export function buildClientSearchChips(snapshot: ClientSearchSnapshot, catalogs?: ClientSearchCatalogs | null): ClientSearchChip[] {
  const normalized = sanitizeClientSearchSnapshot(snapshot);
  const chips: ClientSearchChip[] = [];

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

export function buildClientSmartSearchColumns(catalogs?: ClientSearchCatalogs | null): ClientSmartSearchColumn[] {
  return [
    {
      id: ClientSearchFields.FULL_NAME,
      label: "Nombre",
      kind: "text",
      description: "Busca por nombre completo.",
      operators: TEXT_OPERATOR_OPTIONS,
      placeholder: "Ej. Juan Perez",
    },
    {
      id: ClientSearchFields.DOC_NUMBER,
      label: "Documento",
      kind: "text",
      description: "Busca por número de documento.",
      operators: TEXT_OPERATOR_OPTIONS,
      placeholder: "Ej. 12345678",
    },
    {
      id: ClientSearchFields.TYPE,
      label: "Tipo",
      kind: "catalog",
      description: "Filtra por tipo de cliente.",
      operators: [{ id: ClientSearchOperators.IN, label: "Es alguno de" }],
      supportsExclude: true,
      options: catalogs?.clientTypes ?? [],
    },
    {
      id: ClientSearchFields.DOC_TYPE,
      label: "Tipo documento",
      kind: "catalog",
      description: "Filtra por tipo de documento.",
      operators: [{ id: ClientSearchOperators.IN, label: "Es alguno de" }],
      supportsExclude: true,
      options: catalogs?.docTypes ?? [],
    },
    {
      id: ClientSearchFields.DEPARTMENT_ID,
      label: "Departamento",
      kind: "catalog",
      description: "Filtra por departamento.",
      operators: [{ id: ClientSearchOperators.IN, label: "Es alguno de" }],
      supportsExclude: true,
      options: catalogs?.departments ?? [],
    },
    {
      id: ClientSearchFields.PROVINCE_ID,
      label: "Provincia",
      kind: "catalog",
      description: "Filtra por provincia.",
      operators: [{ id: ClientSearchOperators.IN, label: "Es alguno de" }],
      supportsExclude: true,
      options: catalogs?.provinces ?? [],
    },
    {
      id: ClientSearchFields.DISTRICT_ID,
      label: "Distrito",
      kind: "catalog",
      description: "Filtra por distrito.",
      operators: [{ id: ClientSearchOperators.IN, label: "Es alguno de" }],
      supportsExclude: true,
      options: catalogs?.districts ?? [],
    },
    {
      id: ClientSearchFields.ADDRESS,
      label: "Dirección",
      kind: "text",
      description: "Busca por dirección.",
      operators: TEXT_OPERATOR_OPTIONS,
      placeholder: "Ej. Av. Principal 123",
    },
    {
      id: ClientSearchFields.REFERENCE,
      label: "Referencia",
      kind: "text",
      description: "Busca por referencia.",
      operators: TEXT_OPERATOR_OPTIONS,
      placeholder: "Ej. feria",
    },
  ];
}

export function applyClientSearchRuleWithDependencies(snapshot: ClientSearchSnapshot, rule: ClientSearchRule) {
  let nextSnapshot = upsertClientSearchRule(snapshot, rule);

  if (rule.field === ClientSearchFields.DEPARTMENT_ID) {
    nextSnapshot = removeClientSearchKey(nextSnapshot, ClientSearchFields.PROVINCE_ID);
    nextSnapshot = removeClientSearchKey(nextSnapshot, ClientSearchFields.DISTRICT_ID);
  }

  if (rule.field === ClientSearchFields.PROVINCE_ID) {
    nextSnapshot = removeClientSearchKey(nextSnapshot, ClientSearchFields.DISTRICT_ID);
  }

  return nextSnapshot;
}

export function removeClientSearchKeyWithDependencies(snapshot: ClientSearchSnapshot, key: "q" | ClientSearchFilterKey) {
  let nextSnapshot = removeClientSearchKey(snapshot, key);

  if (key === ClientSearchFields.DEPARTMENT_ID) {
    nextSnapshot = removeClientSearchKey(nextSnapshot, ClientSearchFields.PROVINCE_ID);
    nextSnapshot = removeClientSearchKey(nextSnapshot, ClientSearchFields.DISTRICT_ID);
  }

  if (key === ClientSearchFields.PROVINCE_ID) {
    nextSnapshot = removeClientSearchKey(nextSnapshot, ClientSearchFields.DISTRICT_ID);
  }

  return nextSnapshot;
}
