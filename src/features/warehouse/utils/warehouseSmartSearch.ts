import type {
  DataTableSearchChip,
  DataTableSearchOption,
  SmartSearchFieldConfig,
  SmartSearchOperatorOption,
} from "@/shared/components/table/search";
import type {
  WarehouseSearchField,
  WarehouseSearchCatalogs,
  WarehouseSearchFilters,
  WarehouseSearchOperator,
  WarehouseSearchRule,
  WarehouseSearchSnapshot,
} from "@/features/warehouse/types/warehouse";
import {
  WarehouseSearchFields,
  WarehouseSearchOperators,
} from "@/features/warehouse/types/warehouse";

export type WarehouseSearchFilterKey = WarehouseSearchField;

export type WarehouseSearchChip = DataTableSearchChip<WarehouseSearchFilterKey>;

export type WarehouseSmartSearchColumn = SmartSearchFieldConfig<
  WarehouseSearchFilterKey,
  WarehouseSearchOperator
>;

type WarehouseSearchOperatorOption = SmartSearchOperatorOption<WarehouseSearchOperator>;

const FIELD_ORDER: WarehouseSearchField[] = [
  WarehouseSearchFields.NAME,
  WarehouseSearchFields.DEPARTMENT,
  WarehouseSearchFields.PROVINCE,
  WarehouseSearchFields.DISTRICT,
  WarehouseSearchFields.ADDRESS,
  WarehouseSearchFields.IS_ACTIVE,
];

const FIELD_LABELS: Record<WarehouseSearchField, string> = {
  [WarehouseSearchFields.NAME]: "Almacen",
  [WarehouseSearchFields.DEPARTMENT]: "Departamento",
  [WarehouseSearchFields.PROVINCE]: "Provincia",
  [WarehouseSearchFields.DISTRICT]: "Distrito",
  [WarehouseSearchFields.ADDRESS]: "Direccion",
  [WarehouseSearchFields.IS_ACTIVE]: "Estado",
};

const CATALOG_FIELDS = new Set<WarehouseSearchField>([
  WarehouseSearchFields.DEPARTMENT,
  WarehouseSearchFields.PROVINCE,
  WarehouseSearchFields.DISTRICT,
  WarehouseSearchFields.IS_ACTIVE,
]);

const TEXT_FIELDS = new Set<WarehouseSearchField>([
  WarehouseSearchFields.NAME,
  WarehouseSearchFields.ADDRESS,
]);

const TEXT_OPERATOR_OPTIONS: WarehouseSearchOperatorOption[] = [
  { id: WarehouseSearchOperators.CONTAINS, label: "Contiene" },
  { id: WarehouseSearchOperators.EQ, label: "Es igual a" },
];

const STATUS_OPTIONS: DataTableSearchOption[] = [
  { id: "true", label: "Activos", keywords: ["activo", "habilitado"] },
  { id: "false", label: "Inactivos", keywords: ["inactivo", "deshabilitado"] },
];

const OPERATOR_LABELS: Record<WarehouseSearchOperator, string> = {
  [WarehouseSearchOperators.IN]: ":",
  [WarehouseSearchOperators.CONTAINS]: "contiene",
  [WarehouseSearchOperators.EQ]: "=",
};

function uniqueStrings(values: string[] | undefined) {
  return Array.from(
    new Set((values ?? []).map((value) => value?.trim()).filter(Boolean)),
  ) as string[];
}

function normalizeLegacyField(field?: string | null): WarehouseSearchField | null {
  if (field === "status") return WarehouseSearchFields.IS_ACTIVE;
  if (field === "createdAt") return null;
  return field && Object.values(WarehouseSearchFields).includes(field as WarehouseSearchField)
    ? (field as WarehouseSearchField)
    : null;
}

function sanitizeRule(rule?: Partial<WarehouseSearchRule> | null): WarehouseSearchRule | null {
  if (!rule?.field || !rule.operator) return null;
  const field = normalizeLegacyField(rule.field);
  if (!field) return null;
  if (!Object.values(WarehouseSearchOperators).includes(rule.operator)) return null;

  if (CATALOG_FIELDS.has(field)) {
    if (rule.operator !== WarehouseSearchOperators.IN) return null;
    const values = uniqueStrings(rule.values ?? (rule.value ? [rule.value] : undefined));
    if (!values.length) return null;
    return {
      field,
      operator: rule.operator,
      mode: rule.mode === "exclude" ? "exclude" : "include",
      values,
    };
  }

  if (TEXT_FIELDS.has(field)) {
    if (
      rule.operator !== WarehouseSearchOperators.CONTAINS &&
      rule.operator !== WarehouseSearchOperators.EQ
    ) {
      return null;
    }
    const value = rule.value?.trim();
    if (!value) return null;
    return {
      field,
      operator: rule.operator,
      value,
    };
  }

  return null;
}

function getCatalogMaps(catalogs?: WarehouseSearchCatalogs | null) {
  return {
    department: new Map(catalogs?.departments.map((item) => [item.id, item.label]) ?? []),
    province: new Map(catalogs?.provinces.map((item) => [item.id, item.label]) ?? []),
    district: new Map(catalogs?.districts.map((item) => [item.id, item.label]) ?? []),
    isActive: new Map((catalogs?.activeStates ?? STATUS_OPTIONS).map((item) => [item.id, item.label])),
  };
}

function getCatalogLabels(
  field: WarehouseSearchField,
  values: string[],
  catalogs?: WarehouseSearchCatalogs | null,
) {
  const maps = getCatalogMaps(catalogs);
  const map =
    field === WarehouseSearchFields.DEPARTMENT
      ? maps.department
      : field === WarehouseSearchFields.PROVINCE
        ? maps.province
        : field === WarehouseSearchFields.DISTRICT
          ? maps.district
          : field === WarehouseSearchFields.IS_ACTIVE
            ? maps.isActive
            : new Map<string, string>();

  return values.map((value) => map.get(value) ?? value);
}

function getRuleLabel(
  rule: WarehouseSearchRule,
  catalogs?: WarehouseSearchCatalogs | null,
  includeFieldLabel = true,
) {
  const fieldLabel = FIELD_LABELS[rule.field];

  if (rule.operator === WarehouseSearchOperators.IN) {
    const labels = getCatalogLabels(rule.field, rule.values ?? [], catalogs);
    const content = labels.join(" - ");
    const prefix =
      rule.mode === "exclude"
        ? includeFieldLabel
          ? `${fieldLabel} excluye: `
          : "Excluye: "
        : includeFieldLabel
          ? `${fieldLabel}: `
          : "";
    return `${prefix}${content}`;
  }

  if (!rule.value) return includeFieldLabel ? fieldLabel : "";
  const content = `${OPERATOR_LABELS[rule.operator]} ${rule.value}`;
  return includeFieldLabel ? `${fieldLabel} ${content}` : content;
}

export function createEmptyWarehouseSearchFilters(): WarehouseSearchFilters {
  return [];
}

export function createEmptyWarehouseSearchSnapshot(): WarehouseSearchSnapshot {
  return {
    filters: createEmptyWarehouseSearchFilters(),
  };
}

export function sanitizeWarehouseSearchSnapshot(
  snapshot?: Partial<WarehouseSearchSnapshot> | { q?: string; filters?: unknown } | null,
): WarehouseSearchSnapshot {
  const q = snapshot?.q?.trim();
  const rawFilters = Array.isArray(snapshot?.filters) ? snapshot.filters : [];
  const mergedByField = new Map<WarehouseSearchField, WarehouseSearchRule>();

  rawFilters.forEach((rule) => {
    const normalized = sanitizeRule(rule as WarehouseSearchRule);
    if (!normalized) return;
    mergedByField.set(normalized.field, normalized);
  });

  return {
    q: q || undefined,
    filters: FIELD_ORDER.map((field) => mergedByField.get(field)).filter(Boolean) as WarehouseSearchRule[],
  };
}

export function hasWarehouseSearchCriteria(snapshot: WarehouseSearchSnapshot) {
  return Boolean(snapshot.q || snapshot.filters.length);
}

export function findWarehouseSearchRule(
  snapshot: WarehouseSearchSnapshot,
  key: WarehouseSearchFilterKey,
) {
  return sanitizeWarehouseSearchSnapshot(snapshot).filters.find((rule) => rule.field === key) ?? null;
}

export function upsertWarehouseSearchRule(
  snapshot: WarehouseSearchSnapshot,
  rule: WarehouseSearchRule,
) {
  const normalized = sanitizeWarehouseSearchSnapshot(snapshot);
  return sanitizeWarehouseSearchSnapshot({
    ...normalized,
    filters: [
      ...normalized.filters.filter((item) => item.field !== rule.field),
      rule,
    ],
  });
}

export function removeWarehouseSearchKey(
  snapshot: WarehouseSearchSnapshot,
  key: "q" | WarehouseSearchFilterKey,
) {
  const normalized = sanitizeWarehouseSearchSnapshot(snapshot);

  if (key === "q") {
    return sanitizeWarehouseSearchSnapshot({
      ...normalized,
      q: undefined,
    });
  }

  return sanitizeWarehouseSearchSnapshot({
    ...normalized,
    filters: normalized.filters.filter((rule) => rule.field !== key),
  });
}

export function getWarehouseSearchRuleValues(
  snapshot: WarehouseSearchSnapshot,
  key: WarehouseSearchFilterKey,
) {
  const rule = findWarehouseSearchRule(snapshot, key);
  return rule?.operator === WarehouseSearchOperators.IN ? rule.values ?? [] : [];
}

export function buildWarehouseSearchChips(
  snapshot: WarehouseSearchSnapshot,
  catalogs?: WarehouseSearchCatalogs | null,
): WarehouseSearchChip[] {
  const normalized = sanitizeWarehouseSearchSnapshot(snapshot);
  const chips: WarehouseSearchChip[] = [];

  if (normalized.q) {
    chips.push({
      id: "q",
      label: `Busqueda: ${normalized.q}`,
      removeKey: "q",
    });
  }

  normalized.filters.forEach((rule) => {
    const label = getRuleLabel(rule, catalogs);
    if (!label) return;
    chips.push({
      id: rule.field,
      label,
      removeKey: rule.field,
    });
  });

  return chips;
}

export function getWarehouseSearchSelectionCount(
  snapshot: WarehouseSearchSnapshot,
  key: WarehouseSearchFilterKey,
) {
  const rule = findWarehouseSearchRule(snapshot, key);
  if (!rule) return 0;
  return rule.operator === WarehouseSearchOperators.IN ? rule.values?.length ?? 0 : 1;
}

export function getWarehouseSearchRuleSummary(
  snapshot: WarehouseSearchSnapshot,
  key: WarehouseSearchFilterKey,
  catalogs?: WarehouseSearchCatalogs | null,
) {
  const rule = findWarehouseSearchRule(snapshot, key);
  if (!rule) return null;
  return getRuleLabel(rule, catalogs, false);
}

export function buildWarehouseSmartSearchColumns(
  catalogs?: WarehouseSearchCatalogs | null,
): WarehouseSmartSearchColumn[] {
  return [
    {
      id: WarehouseSearchFields.NAME,
      label: "Almacen",
      kind: "text",
      description: "Busca por nombre del almacen.",
      operators: TEXT_OPERATOR_OPTIONS,
      placeholder: "Ej. Almacen central",
    },
    {
      id: WarehouseSearchFields.DEPARTMENT,
      label: "Departamento",
      kind: "catalog",
      description: "Selecciona departamentos para incluir o excluir.",
      operators: [{ id: WarehouseSearchOperators.IN, label: "Es alguno de" }],
      supportsExclude: true,
      options: catalogs?.departments ?? [],
    },
    {
      id: WarehouseSearchFields.PROVINCE,
      label: "Provincia",
      kind: "catalog",
      description: "Selecciona provincias para incluir o excluir.",
      operators: [{ id: WarehouseSearchOperators.IN, label: "Es alguno de" }],
      supportsExclude: true,
      options: catalogs?.provinces ?? [],
    },
    {
      id: WarehouseSearchFields.DISTRICT,
      label: "Distrito",
      kind: "catalog",
      description: "Selecciona distritos para incluir o excluir.",
      operators: [{ id: WarehouseSearchOperators.IN, label: "Es alguno de" }],
      supportsExclude: true,
      options: catalogs?.districts ?? [],
    },
    {
      id: WarehouseSearchFields.ADDRESS,
      label: "Direccion",
      kind: "text",
      description: "Busca por direccion del almacen.",
      operators: TEXT_OPERATOR_OPTIONS,
      placeholder: "Ej. Av. Principal 123",
    },
    {
      id: WarehouseSearchFields.IS_ACTIVE,
      label: "Estado",
      kind: "catalog",
      description: "Selecciona estados para incluir o excluir del resultado.",
      operators: [{ id: WarehouseSearchOperators.IN, label: "Es alguno de" }],
      supportsExclude: true,
      options: catalogs?.activeStates ?? STATUS_OPTIONS,
    },
  ];
}

export function applyWarehouseSearchRuleWithDependencies(
  snapshot: WarehouseSearchSnapshot,
  rule: WarehouseSearchRule,
) {
  let nextSnapshot = upsertWarehouseSearchRule(snapshot, rule);

  if (rule.field === WarehouseSearchFields.DEPARTMENT) {
    nextSnapshot = removeWarehouseSearchKey(nextSnapshot, WarehouseSearchFields.PROVINCE);
    nextSnapshot = removeWarehouseSearchKey(nextSnapshot, WarehouseSearchFields.DISTRICT);
  }

  if (rule.field === WarehouseSearchFields.PROVINCE) {
    nextSnapshot = removeWarehouseSearchKey(nextSnapshot, WarehouseSearchFields.DISTRICT);
  }

  return nextSnapshot;
}

export function removeWarehouseSearchKeyWithDependencies(
  snapshot: WarehouseSearchSnapshot,
  key: "q" | WarehouseSearchFilterKey,
) {
  let nextSnapshot = removeWarehouseSearchKey(snapshot, key);

  if (key === WarehouseSearchFields.DEPARTMENT) {
    nextSnapshot = removeWarehouseSearchKey(nextSnapshot, WarehouseSearchFields.PROVINCE);
    nextSnapshot = removeWarehouseSearchKey(nextSnapshot, WarehouseSearchFields.DISTRICT);
  }

  if (key === WarehouseSearchFields.PROVINCE) {
    nextSnapshot = removeWarehouseSearchKey(nextSnapshot, WarehouseSearchFields.DISTRICT);
  }

  return nextSnapshot;
}
