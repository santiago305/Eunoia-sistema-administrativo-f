import type {
  DataTableSearchChip,
  DataTableSearchOption,
  SmartSearchFieldConfig,
  SmartSearchOperatorOption,
} from "@/components/table/search";
import { DocumentType } from "@/pages/providers/types/DocumentType";
import type {
  ProviderSearchField,
  ProviderSearchFilters,
  ProviderSearchOperator,
  ProviderSearchRule,
  ProviderSearchSnapshot,
  ProviderSearchStateResponse,
} from "@/pages/providers/types/supplier";
import {
  ProviderSearchFields,
  ProviderSearchOperators,
} from "@/pages/providers/types/supplier";

export type ProviderSearchFilterKey = ProviderSearchField;

export type ProviderSearchChip = DataTableSearchChip<ProviderSearchFilterKey>;

export type ProviderSmartSearchColumn = SmartSearchFieldConfig<
  ProviderSearchFilterKey,
  ProviderSearchOperator
>;

type ProviderSearchOperatorOption = SmartSearchOperatorOption<ProviderSearchOperator>;

const FIELD_ORDER: ProviderSearchField[] = [
  ProviderSearchFields.DOCUMENT_TYPE,
  ProviderSearchFields.IS_ACTIVE,
  ProviderSearchFields.DOCUMENT_NUMBER,
  ProviderSearchFields.NAME,
  ProviderSearchFields.LAST_NAME,
  ProviderSearchFields.TRADE_NAME,
  ProviderSearchFields.PHONE,
  ProviderSearchFields.EMAIL,
];

const FIELD_LABELS: Record<ProviderSearchField, string> = {
  [ProviderSearchFields.DOCUMENT_TYPE]: "Tipo de documento",
  [ProviderSearchFields.DOCUMENT_NUMBER]: "Documento",
  [ProviderSearchFields.NAME]: "Nombre",
  [ProviderSearchFields.LAST_NAME]: "Apellido",
  [ProviderSearchFields.TRADE_NAME]: "Nombre comercial",
  [ProviderSearchFields.PHONE]: "Telefono",
  [ProviderSearchFields.EMAIL]: "Correo",
  [ProviderSearchFields.IS_ACTIVE]: "Estado",
};

const CATALOG_FIELDS = new Set<ProviderSearchField>([
  ProviderSearchFields.DOCUMENT_TYPE,
  ProviderSearchFields.IS_ACTIVE,
]);

const TEXT_FIELDS = new Set<ProviderSearchField>([
  ProviderSearchFields.DOCUMENT_NUMBER,
  ProviderSearchFields.NAME,
  ProviderSearchFields.LAST_NAME,
  ProviderSearchFields.TRADE_NAME,
  ProviderSearchFields.PHONE,
  ProviderSearchFields.EMAIL,
]);

const TEXT_OPERATOR_OPTIONS: ProviderSearchOperatorOption[] = [
  { id: ProviderSearchOperators.CONTAINS, label: "Contiene" },
  { id: ProviderSearchOperators.EQ, label: "Es igual a" },
];

const DOCUMENT_TYPE_OPTIONS: DataTableSearchOption[] = [
  { id: DocumentType.RUC, label: "RUC", keywords: ["ruc", "06"] },
  { id: DocumentType.DNI, label: "DNI", keywords: ["dni", "01"] },
  { id: DocumentType.CE, label: "Carnet de extranjeria", keywords: ["ce", "04"] },
];

const STATUS_OPTIONS: DataTableSearchOption[] = [
  { id: "true", label: "Activos", keywords: ["activo", "habilitado"] },
  { id: "false", label: "Inactivos", keywords: ["inactivo", "deshabilitado"] },
];

const OPERATOR_LABELS: Record<ProviderSearchOperator, string> = {
  [ProviderSearchOperators.IN]: ":",
  [ProviderSearchOperators.CONTAINS]: "contiene",
  [ProviderSearchOperators.EQ]: "=",
};

function uniqueStrings(values: string[] | undefined) {
  return Array.from(
    new Set((values ?? []).map((value) => value?.trim()).filter(Boolean)),
  ) as string[];
}

function normalizeLegacyField(field?: string | null): ProviderSearchField | null {
  if (field === "status") return ProviderSearchFields.IS_ACTIVE;
  if (field === "leadTimeDays") return null;
  return field && Object.values(ProviderSearchFields).includes(field as ProviderSearchField)
    ? (field as ProviderSearchField)
    : null;
}

function sanitizeRule(rule?: Partial<ProviderSearchRule> | null): ProviderSearchRule | null {
  if (!rule?.field || !rule.operator) return null;
  const field = normalizeLegacyField(rule.field);
  if (!field) return null;
  if (!Object.values(ProviderSearchOperators).includes(rule.operator)) return null;

  if (CATALOG_FIELDS.has(field)) {
    if (rule.operator !== ProviderSearchOperators.IN) return null;
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
      rule.operator !== ProviderSearchOperators.CONTAINS &&
      rule.operator !== ProviderSearchOperators.EQ
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

function getCatalogMaps(searchState?: ProviderSearchStateResponse | null) {
  return {
    documentType: new Map(
      (searchState?.catalogs.documentTypes ?? DOCUMENT_TYPE_OPTIONS).map((item) => [item.id, item.label]),
    ),
    isActive: new Map(
      (searchState?.catalogs.activeStates ?? STATUS_OPTIONS).map((item) => [item.id, item.label]),
    ),
  };
}

function getCatalogLabels(
  field: ProviderSearchField,
  values: string[],
  searchState?: ProviderSearchStateResponse | null,
) {
  const maps = getCatalogMaps(searchState);
  const map =
    field === ProviderSearchFields.DOCUMENT_TYPE
      ? maps.documentType
      : field === ProviderSearchFields.IS_ACTIVE
        ? maps.isActive
        : new Map<string, string>();

  return values.map((value) => map.get(value) ?? value);
}

function getRuleLabel(
  rule: ProviderSearchRule,
  searchState?: ProviderSearchStateResponse | null,
  includeFieldLabel = true,
) {
  const fieldLabel = FIELD_LABELS[rule.field];

  if (rule.operator === ProviderSearchOperators.IN) {
    const labels = getCatalogLabels(rule.field, rule.values ?? [], searchState);
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

export function createEmptyProviderSearchFilters(): ProviderSearchFilters {
  return [];
}

export function createEmptyProviderSearchSnapshot(): ProviderSearchSnapshot {
  return {
    filters: createEmptyProviderSearchFilters(),
  };
}

export function sanitizeProviderSearchSnapshot(
  snapshot?: Partial<ProviderSearchSnapshot> | { q?: string; filters?: unknown } | null,
): ProviderSearchSnapshot {
  const q = snapshot?.q?.trim();
  const rawFilters = Array.isArray(snapshot?.filters) ? snapshot.filters : [];
  const mergedByField = new Map<ProviderSearchField, ProviderSearchRule>();

  rawFilters.forEach((rule) => {
    const normalized = sanitizeRule(rule as ProviderSearchRule);
    if (!normalized) return;
    mergedByField.set(normalized.field, normalized);
  });

  return {
    q: q || undefined,
    filters: FIELD_ORDER.map((field) => mergedByField.get(field)).filter(Boolean) as ProviderSearchRule[],
  };
}

export function hasProviderSearchCriteria(snapshot: ProviderSearchSnapshot) {
  return Boolean(snapshot.q || snapshot.filters.length);
}

export function findProviderSearchRule(
  snapshot: ProviderSearchSnapshot,
  key: ProviderSearchFilterKey,
) {
  return sanitizeProviderSearchSnapshot(snapshot).filters.find((rule) => rule.field === key) ?? null;
}

export function upsertProviderSearchRule(
  snapshot: ProviderSearchSnapshot,
  rule: ProviderSearchRule,
) {
  const normalized = sanitizeProviderSearchSnapshot(snapshot);
  return sanitizeProviderSearchSnapshot({
    ...normalized,
    filters: [
      ...normalized.filters.filter((item) => item.field !== rule.field),
      rule,
    ],
  });
}

export function removeProviderSearchKey(
  snapshot: ProviderSearchSnapshot,
  key: "q" | ProviderSearchFilterKey,
) {
  const normalized = sanitizeProviderSearchSnapshot(snapshot);

  if (key === "q") {
    return sanitizeProviderSearchSnapshot({
      ...normalized,
      q: undefined,
    });
  }

  return sanitizeProviderSearchSnapshot({
    ...normalized,
    filters: normalized.filters.filter((rule) => rule.field !== key),
  });
}

export function buildProviderSearchChips(
  snapshot: ProviderSearchSnapshot,
  searchState?: ProviderSearchStateResponse | null,
): ProviderSearchChip[] {
  const normalized = sanitizeProviderSearchSnapshot(snapshot);
  const chips: ProviderSearchChip[] = [];

  if (normalized.q) {
    chips.push({
      id: "q",
      label: `Busqueda: ${normalized.q}`,
      removeKey: "q",
    });
  }

  normalized.filters.forEach((rule) => {
    const label = getRuleLabel(rule, searchState);
    if (!label) return;
    chips.push({
      id: rule.field,
      label,
      removeKey: rule.field,
    });
  });

  return chips;
}

export function getProviderSearchSelectionCount(
  snapshot: ProviderSearchSnapshot,
  key: ProviderSearchFilterKey,
) {
  const rule = findProviderSearchRule(snapshot, key);
  if (!rule) return 0;
  return rule.operator === ProviderSearchOperators.IN ? rule.values?.length ?? 0 : 1;
}

export function getProviderSearchRuleSummary(
  snapshot: ProviderSearchSnapshot,
  key: ProviderSearchFilterKey,
  searchState?: ProviderSearchStateResponse | null,
) {
  const rule = findProviderSearchRule(snapshot, key);
  if (!rule) return null;
  return getRuleLabel(rule, searchState, false);
}

export function buildProviderSmartSearchColumns(
  searchState?: ProviderSearchStateResponse | null,
): ProviderSmartSearchColumn[] {
  return [
    {
      id: ProviderSearchFields.DOCUMENT_TYPE,
      label: "Tipo de documento",
      kind: "catalog",
      description: "Selecciona uno o varios tipos y define si se incluyen o excluyen.",
      operators: [{ id: ProviderSearchOperators.IN, label: "Es alguno de" }],
      supportsExclude: true,
      options: searchState?.catalogs.documentTypes ?? DOCUMENT_TYPE_OPTIONS,
    },
    {
      id: ProviderSearchFields.DOCUMENT_NUMBER,
      label: "Documento",
      kind: "text",
      description: "Busca por coincidencia o igualdad exacta del numero de documento.",
      operators: TEXT_OPERATOR_OPTIONS,
      placeholder: "Ej. 20123456789",
    },
    {
      id: ProviderSearchFields.NAME,
      label: "Nombre",
      kind: "text",
      description: "Busca por nombre del proveedor.",
      operators: TEXT_OPERATOR_OPTIONS,
      placeholder: "Ej. Juan",
    },
    {
      id: ProviderSearchFields.LAST_NAME,
      label: "Apellido",
      kind: "text",
      description: "Busca por apellido del proveedor.",
      operators: TEXT_OPERATOR_OPTIONS,
      placeholder: "Ej. Perez",
    },
    {
      id: ProviderSearchFields.TRADE_NAME,
      label: "Nombre comercial",
      kind: "text",
      description: "Busca por nombre comercial o razon social.",
      operators: TEXT_OPERATOR_OPTIONS,
      placeholder: "Ej. Comercial Andina",
    },
    {
      id: ProviderSearchFields.PHONE,
      label: "Telefono",
      kind: "text",
      description: "Busca por telefono de contacto.",
      operators: TEXT_OPERATOR_OPTIONS,
      placeholder: "Ej. 987654321",
    },
    {
      id: ProviderSearchFields.EMAIL,
      label: "Correo",
      kind: "text",
      description: "Busca por correo electronico del proveedor.",
      operators: TEXT_OPERATOR_OPTIONS,
      placeholder: "Ej. proveedor@correo.com",
    },
    {
      id: ProviderSearchFields.IS_ACTIVE,
      label: "Estado",
      kind: "catalog",
      description: "Selecciona estados para incluir o excluir del resultado.",
      operators: [{ id: ProviderSearchOperators.IN, label: "Es alguno de" }],
      supportsExclude: true,
      options: searchState?.catalogs.activeStates ?? STATUS_OPTIONS,
    },
  ];
}
