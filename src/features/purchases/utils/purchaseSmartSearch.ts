import type {
  DataTableSearchChip,
  DataTableSearchOption,
  SmartSearchFieldConfig,
  SmartSearchOperatorOption,
} from "@/shared/components/table/search";
import type {
  PurchaseRecentSearch,
  PurchaseSavedMetric,
  PurchaseSearchField,
  PurchaseSearchFilters,
  PurchaseSearchOperator,
  PurchaseSearchRule,
  PurchaseSearchSnapshot,
  PurchaseSearchStateResponse,
  PurchaseWaitTimeState,
} from "../types/purchase";
import {
  PurchaseSearchFields,
  PurchaseSearchOperators,
  PurchaseWaitTimeStates,
} from "../types/purchase";

type LegacyPurchaseSearchFilters = {
  supplierIds?: string[];
  warehouseIds?: string[];
  statuses?: string[];
  documentTypes?: string[];
  paymentForms?: string[];
};

export type PurchaseSearchFilterKey = PurchaseSearchField;

export type PurchaseSearchChip = DataTableSearchChip<PurchaseSearchFilterKey>;

export type PurchaseSmartSearchColumn = SmartSearchFieldConfig<
  PurchaseSearchFilterKey,
  PurchaseSearchOperator
>;

type PurchaseSearchOperatorOption = SmartSearchOperatorOption<PurchaseSearchOperator>;

const FIELD_ORDER: PurchaseSearchField[] = [
  PurchaseSearchFields.DATE_ISSUE,
  PurchaseSearchFields.DOCUMENT_TYPE,
  PurchaseSearchFields.NUMBER,
  PurchaseSearchFields.SUPPLIER_ID,
  PurchaseSearchFields.WAREHOUSE_ID,
  PurchaseSearchFields.PAYMENT_FORM,
  PurchaseSearchFields.TOTAL,
  PurchaseSearchFields.TOTAL_PAID,
  PurchaseSearchFields.TOTAL_TO_PAY,
  PurchaseSearchFields.STATUS,
  PurchaseSearchFields.WAIT_TIME,
  PurchaseSearchFields.EXPECTED_AT,
];

const FIELD_LABELS: Record<PurchaseSearchField, string> = {
  [PurchaseSearchFields.SUPPLIER_ID]: "Proveedor",
  [PurchaseSearchFields.WAREHOUSE_ID]: "Almacen",
  [PurchaseSearchFields.STATUS]: "Estado",
  [PurchaseSearchFields.DOCUMENT_TYPE]: "Documento",
  [PurchaseSearchFields.PAYMENT_FORM]: "Forma",
  [PurchaseSearchFields.NUMBER]: "Numero",
  [PurchaseSearchFields.TOTAL]: "Total",
  [PurchaseSearchFields.TOTAL_PAID]: "Pagado",
  [PurchaseSearchFields.TOTAL_TO_PAY]: "Pendiente",
  [PurchaseSearchFields.WAIT_TIME]: "T. Espera",
  [PurchaseSearchFields.DATE_ISSUE]: "Emision",
  [PurchaseSearchFields.EXPECTED_AT]: "Ing. Almacen",
};

const CATALOG_FIELDS = new Set<PurchaseSearchField>([
  PurchaseSearchFields.SUPPLIER_ID,
  PurchaseSearchFields.WAREHOUSE_ID,
  PurchaseSearchFields.STATUS,
  PurchaseSearchFields.DOCUMENT_TYPE,
  PurchaseSearchFields.PAYMENT_FORM,
  PurchaseSearchFields.WAIT_TIME,
]);

const TEXT_FIELDS = new Set<PurchaseSearchField>([
  PurchaseSearchFields.NUMBER,
]);

const NUMERIC_FIELDS = new Set<PurchaseSearchField>([
  PurchaseSearchFields.TOTAL,
  PurchaseSearchFields.TOTAL_PAID,
  PurchaseSearchFields.TOTAL_TO_PAY,
]);

const DATE_FIELDS = new Set<PurchaseSearchField>([
  PurchaseSearchFields.DATE_ISSUE,
  PurchaseSearchFields.EXPECTED_AT,
]);

const TEXT_OPERATORS = new Set<PurchaseSearchOperator>([
  PurchaseSearchOperators.CONTAINS,
  PurchaseSearchOperators.EQ,
]);

const NUMERIC_OPERATORS = new Set<PurchaseSearchOperator>([
  PurchaseSearchOperators.EQ,
  PurchaseSearchOperators.GT,
  PurchaseSearchOperators.GTE,
  PurchaseSearchOperators.LT,
  PurchaseSearchOperators.LTE,
]);

const DATE_OPERATORS = new Set<PurchaseSearchOperator>([
  PurchaseSearchOperators.ON,
  PurchaseSearchOperators.AFTER,
  PurchaseSearchOperators.BEFORE,
  PurchaseSearchOperators.BETWEEN,
  PurchaseSearchOperators.ON_OR_AFTER,
  PurchaseSearchOperators.ON_OR_BEFORE,
]);

const TEXT_OPERATOR_OPTIONS: PurchaseSearchOperatorOption[] = [
  { id: PurchaseSearchOperators.CONTAINS, label: "Contiene" },
  { id: PurchaseSearchOperators.EQ, label: "Es igual a" },
];

const NUMBER_OPERATOR_OPTIONS: PurchaseSearchOperatorOption[] = [
  { id: PurchaseSearchOperators.EQ, label: "Igual a" },
  { id: PurchaseSearchOperators.GT, label: "Mayor que" },
  { id: PurchaseSearchOperators.GTE, label: "Mayor o igual" },
  { id: PurchaseSearchOperators.LT, label: "Menor que" },
  { id: PurchaseSearchOperators.LTE, label: "Menor o igual" },
];

const DATE_OPERATOR_OPTIONS: PurchaseSearchOperatorOption[] = [
  { id: PurchaseSearchOperators.ON, label: "Es" },
  { id: PurchaseSearchOperators.AFTER, label: "Despues de" },
  { id: PurchaseSearchOperators.BEFORE, label: "Antes de" },
  { id: PurchaseSearchOperators.BETWEEN, label: "Entre" },
];

const WAIT_TIME_OPTIONS: DataTableSearchOption[] = [
  { id: PurchaseWaitTimeStates.NOT_STARTED, label: "Todavia no comienza", keywords: ["pendiente", "inicio"] },
  { id: PurchaseWaitTimeStates.IN_PROGRESS, label: "En proceso", keywords: ["espera", "proceso", "ingreso"] },
  { id: PurchaseWaitTimeStates.COMPLETED, label: "Completado", keywords: ["recibido", "finalizado"] },
  { id: PurchaseWaitTimeStates.CANCELLED, label: "Cancelado", keywords: ["anulado"] },
];

const OPERATOR_LABELS: Record<PurchaseSearchOperator, string> = {
  [PurchaseSearchOperators.IN]: ":",
  [PurchaseSearchOperators.CONTAINS]: "contiene",
  [PurchaseSearchOperators.EQ]: "=",
  [PurchaseSearchOperators.GT]: ">",
  [PurchaseSearchOperators.GTE]: ">=",
  [PurchaseSearchOperators.LT]: "<",
  [PurchaseSearchOperators.LTE]: "<=",
  [PurchaseSearchOperators.ON]: "=",
  [PurchaseSearchOperators.BEFORE]: "<",
  [PurchaseSearchOperators.AFTER]: ">",
  [PurchaseSearchOperators.BETWEEN]: "entre",
  [PurchaseSearchOperators.ON_OR_BEFORE]: "<=",
  [PurchaseSearchOperators.ON_OR_AFTER]: ">=",
};

function uniqueStrings(values: string[] | undefined) {
  return Array.from(new Set((values ?? []).map((value) => value?.trim()).filter(Boolean))) as string[];
}

function isLegacyFilters(value: unknown): value is LegacyPurchaseSearchFilters {
  return Boolean(value) && !Array.isArray(value) && typeof value === "object";
}

function legacyFiltersToRules(filters?: LegacyPurchaseSearchFilters | null): PurchaseSearchRule[] {
  if (!filters) return [];

  const rules: PurchaseSearchRule[] = [];

  const supplierIds = uniqueStrings(filters.supplierIds);
  if (supplierIds.length) {
    rules.push({
      field: PurchaseSearchFields.SUPPLIER_ID,
      operator: PurchaseSearchOperators.IN,
      values: supplierIds,
    });
  }

  const warehouseIds = uniqueStrings(filters.warehouseIds);
  if (warehouseIds.length) {
    rules.push({
      field: PurchaseSearchFields.WAREHOUSE_ID,
      operator: PurchaseSearchOperators.IN,
      values: warehouseIds,
    });
  }

  const statuses = uniqueStrings(filters.statuses);
  if (statuses.length) {
    rules.push({
      field: PurchaseSearchFields.STATUS,
      operator: PurchaseSearchOperators.IN,
      values: statuses,
    });
  }

  const documentTypes = uniqueStrings(filters.documentTypes);
  if (documentTypes.length) {
    rules.push({
      field: PurchaseSearchFields.DOCUMENT_TYPE,
      operator: PurchaseSearchOperators.IN,
      values: documentTypes,
    });
  }

  const paymentForms = uniqueStrings(filters.paymentForms);
  if (paymentForms.length) {
    rules.push({
      field: PurchaseSearchFields.PAYMENT_FORM,
      operator: PurchaseSearchOperators.IN,
      values: paymentForms,
    });
  }

  return rules;
}

function normalizeDateValue(value?: string | null) {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString().slice(0, 10);
}

function normalizeDateTimeValue(value?: string | null) {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return undefined;
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(
    parsed.getDate(),
  )}T${pad(parsed.getHours())}:${pad(parsed.getMinutes())}:${pad(
    parsed.getSeconds(),
  )}`;
}

function formatRuleValueLabel(value?: string | null) {
  const trimmed = value?.trim();
  if (!trimmed) return "";
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return trimmed;
  const date = `${String(parsed.getDate()).padStart(2, "0")}/${String(
    parsed.getMonth() + 1,
  ).padStart(2, "0")}/${parsed.getFullYear()}`;
  const hasTime = trimmed.includes("T");
  if (!hasTime) return date;
  return `${date} ${String(parsed.getHours()).padStart(2, "0")}:${String(
    parsed.getMinutes(),
  ).padStart(2, "0")}`;
}

function sanitizeRule(rule?: Partial<PurchaseSearchRule> | null): PurchaseSearchRule | null {
  if (!rule?.field || !rule.operator) return null;

  const field = rule.field;
  const operator =
    rule.operator === PurchaseSearchOperators.ON_OR_AFTER
      ? PurchaseSearchOperators.AFTER
      : rule.operator === PurchaseSearchOperators.ON_OR_BEFORE
        ? PurchaseSearchOperators.BEFORE
        : rule.operator;

  if (!Object.values(PurchaseSearchFields).includes(field)) return null;
  if (!Object.values(PurchaseSearchOperators).includes(operator)) return null;

  if (CATALOG_FIELDS.has(field)) {
    if (operator !== PurchaseSearchOperators.IN) return null;
    const values = uniqueStrings(rule.values ?? (rule.value ? [rule.value] : undefined));
    if (!values.length) return null;
    const mode = rule.mode === "exclude" ? "exclude" : "include";

    if (field === PurchaseSearchFields.WAIT_TIME) {
      const allowed = new Set(Object.values(PurchaseWaitTimeStates));
      const normalized = values.filter((value) => allowed.has(value as PurchaseWaitTimeState));
      if (!normalized.length) return null;
      return { field, operator, mode, values: normalized };
    }

    return { field, operator, mode, values };
  }

  if (TEXT_FIELDS.has(field)) {
    if (!TEXT_OPERATORS.has(operator)) return null;
    const value = rule.value?.trim();
    if (!value) return null;
    return { field, operator, value };
  }

  if (NUMERIC_FIELDS.has(field)) {
    if (!NUMERIC_OPERATORS.has(operator)) return null;
    const value = rule.value?.trim();
    if (!value || Number.isNaN(Number(value))) return null;
    return { field, operator, value };
  }

  if (DATE_FIELDS.has(field)) {
    if (!DATE_OPERATORS.has(operator)) return null;

    if (operator === PurchaseSearchOperators.BETWEEN) {
      const start = normalizeDateValue(rule.range?.start);
      const end = normalizeDateValue(rule.range?.end);
      if (!start || !end) return null;
      return {
        field,
        operator,
        range: { start, end },
      };
    }

    if (
      operator === PurchaseSearchOperators.AFTER ||
      operator === PurchaseSearchOperators.BEFORE
    ) {
      const value = normalizeDateTimeValue(rule.value);
      if (!value) return null;
      return { field, operator, value };
    }

    const value = normalizeDateValue(rule.value);
    if (!value) return null;
    return { field, operator, value };
  }

  return null;
}

function getCatalogMaps(searchState?: PurchaseSearchStateResponse | null) {
  return {
    supplierId: new Map(searchState?.catalogs.suppliers.map((item) => [item.id, item.label]) ?? []),
    warehouseId: new Map(searchState?.catalogs.warehouses.map((item) => [item.id, item.label]) ?? []),
    status: new Map(searchState?.catalogs.statuses.map((item) => [item.id, item.label]) ?? []),
    documentType: new Map(searchState?.catalogs.documentTypes.map((item) => [item.id, item.label]) ?? []),
    paymentForm: new Map(searchState?.catalogs.paymentForms.map((item) => [item.id, item.label]) ?? []),
    waitTime: new Map(WAIT_TIME_OPTIONS.map((item) => [item.id, item.label])),
  };
}

function getCatalogLabels(
  field: PurchaseSearchField,
  values: string[],
  searchState?: PurchaseSearchStateResponse | null,
) {
  const maps = getCatalogMaps(searchState);
  const map =
    field === PurchaseSearchFields.SUPPLIER_ID ? maps.supplierId :
    field === PurchaseSearchFields.WAREHOUSE_ID ? maps.warehouseId :
    field === PurchaseSearchFields.STATUS ? maps.status :
    field === PurchaseSearchFields.DOCUMENT_TYPE ? maps.documentType :
    field === PurchaseSearchFields.PAYMENT_FORM ? maps.paymentForm :
    field === PurchaseSearchFields.WAIT_TIME ? maps.waitTime :
    new Map<string, string>();
  return values.map((value) => map.get(value) ?? value);
}

function getRuleLabel(
  rule: PurchaseSearchRule,
  searchState?: PurchaseSearchStateResponse | null,
  includeFieldLabel = true,
) {
  const fieldLabel = FIELD_LABELS[rule.field];

  if (rule.operator === PurchaseSearchOperators.IN) {
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

  if (rule.operator === PurchaseSearchOperators.BETWEEN) {
    if (!rule.range?.start || !rule.range?.end) {
      return includeFieldLabel ? fieldLabel : "";
    }
    const content = `${formatRuleValueLabel(rule.range.start)} y ${formatRuleValueLabel(rule.range.end)}`;
    return includeFieldLabel
      ? `${fieldLabel} ${OPERATOR_LABELS[rule.operator]} ${content}`
      : `${OPERATOR_LABELS[rule.operator]} ${content}`;
  }

  if (!rule.value) return includeFieldLabel ? fieldLabel : "";
  const content = `${OPERATOR_LABELS[rule.operator]} ${formatRuleValueLabel(rule.value)}`;
  return includeFieldLabel ? `${fieldLabel} ${content}` : content;
}

export function createEmptyPurchaseSearchFilters(): PurchaseSearchFilters {
  return [];
}

export function createEmptyPurchaseSearchSnapshot(): PurchaseSearchSnapshot {
  return {
    filters: createEmptyPurchaseSearchFilters(),
  };
}

export function sanitizePurchaseSearchSnapshot(
  snapshot?: Partial<PurchaseSearchSnapshot> | { q?: string; filters?: unknown } | null,
): PurchaseSearchSnapshot {
  const q = snapshot?.q?.trim();
  const rawFilters = Array.isArray(snapshot?.filters)
    ? snapshot.filters
    : isLegacyFilters(snapshot?.filters)
      ? legacyFiltersToRules(snapshot.filters)
      : [];

  const mergedByField = new Map<PurchaseSearchField, PurchaseSearchRule>();

  rawFilters.forEach((rule) => {
    const normalized = sanitizeRule(rule as PurchaseSearchRule);
    if (!normalized) return;

    const existing = mergedByField.get(normalized.field);
    if (
      normalized.operator === PurchaseSearchOperators.IN &&
      existing?.operator === PurchaseSearchOperators.IN
    ) {
      mergedByField.set(normalized.field, {
        field: normalized.field,
        operator: normalized.operator,
        mode: normalized.mode ?? existing.mode ?? "include",
        values: uniqueStrings([...(existing.values ?? []), ...(normalized.values ?? [])]),
      });
      return;
    }

    mergedByField.set(normalized.field, normalized);
  });

  return {
    q: q || undefined,
    filters: FIELD_ORDER.map((field) => mergedByField.get(field)).filter(Boolean) as PurchaseSearchRule[],
  };
}

export function hasPurchaseSearchCriteria(snapshot: PurchaseSearchSnapshot) {
  return Boolean(snapshot.q || snapshot.filters.length);
}

export function findPurchaseSearchRule(
  snapshot: PurchaseSearchSnapshot,
  key: PurchaseSearchFilterKey,
) {
  return sanitizePurchaseSearchSnapshot(snapshot).filters.find((rule) => rule.field === key) ?? null;
}

export function togglePurchaseSearchOption(
  snapshot: PurchaseSearchSnapshot,
  key: PurchaseSearchFilterKey,
  optionId: string,
) {
  const normalized = sanitizePurchaseSearchSnapshot(snapshot);
  const existing = findPurchaseSearchRule(normalized, key);
  const currentValues = existing?.values ?? [];
  const nextValues = currentValues.includes(optionId)
    ? currentValues.filter((value) => value !== optionId)
    : [...currentValues, optionId];

  return sanitizePurchaseSearchSnapshot({
    ...normalized,
    filters: [
      ...normalized.filters.filter((rule) => rule.field !== key),
      ...(nextValues.length
        ? [
            {
              field: key,
              operator: PurchaseSearchOperators.IN,
              mode: existing?.mode ?? "include",
              values: nextValues,
            },
          ]
        : []),
    ],
  });
}

export function upsertPurchaseSearchRule(
  snapshot: PurchaseSearchSnapshot,
  rule: PurchaseSearchRule,
) {
  const normalized = sanitizePurchaseSearchSnapshot(snapshot);
  return sanitizePurchaseSearchSnapshot({
    ...normalized,
    filters: [
      ...normalized.filters.filter((item) => item.field !== rule.field),
      rule,
    ],
  });
}

export function removePurchaseSearchKey(
  snapshot: PurchaseSearchSnapshot,
  key: "q" | PurchaseSearchFilterKey,
) {
  const normalized = sanitizePurchaseSearchSnapshot(snapshot);

  if (key === "q") {
    return sanitizePurchaseSearchSnapshot({
      ...normalized,
      q: undefined,
    });
  }

  return sanitizePurchaseSearchSnapshot({
    ...normalized,
    filters: normalized.filters.filter((rule) => rule.field !== key),
  });
}

export function buildPurchaseSearchLabel(
  snapshot: PurchaseSearchSnapshot,
  searchState?: PurchaseSearchStateResponse | null,
) {
  const normalized = sanitizePurchaseSearchSnapshot(snapshot);
  const parts: string[] = [];

  if (normalized.q) {
    parts.push(`Busqueda: ${normalized.q}`);
  }

  normalized.filters.forEach((rule) => {
    const label = getRuleLabel(rule, searchState);
    if (label) parts.push(label);
  });

  return parts.join(" | ") || "Busqueda guardada";
}

export function buildPurchaseSearchChips(
  snapshot: PurchaseSearchSnapshot,
  searchState?: PurchaseSearchStateResponse | null,
): PurchaseSearchChip[] {
  const normalized = sanitizePurchaseSearchSnapshot(snapshot);
  const chips: PurchaseSearchChip[] = [];

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

export function getPurchaseSearchSelectionCount(
  snapshot: PurchaseSearchSnapshot,
  key: PurchaseSearchFilterKey,
) {
  const rule = findPurchaseSearchRule(snapshot, key);
  if (!rule) return 0;
  return rule.operator === PurchaseSearchOperators.IN ? rule.values?.length ?? 0 : 1;
}

export function getPurchaseSearchRuleSummary(
  snapshot: PurchaseSearchSnapshot,
  key: PurchaseSearchFilterKey,
  searchState?: PurchaseSearchStateResponse | null,
) {
  const rule = findPurchaseSearchRule(snapshot, key);
  if (!rule) return null;
  return getRuleLabel(rule, searchState, false);
}

export function buildPurchaseSmartSearchColumns(
  searchState?: PurchaseSearchStateResponse | null,
): PurchaseSmartSearchColumn[] {
  return [
    {
      id: PurchaseSearchFields.DATE_ISSUE,
      label: "Emision",
      kind: "date",
      description: "Busca por emision con fecha o fecha y hora segun la condicion.",
      operators: DATE_OPERATOR_OPTIONS,
      operatorInputMode: {
        [PurchaseSearchOperators.ON]: "date",
        [PurchaseSearchOperators.AFTER]: "datetime",
        [PurchaseSearchOperators.BEFORE]: "datetime",
        [PurchaseSearchOperators.BETWEEN]: "date-range",
      },
      operatorPlaceholder: {
        [PurchaseSearchOperators.ON]: "Selecciona una fecha",
        [PurchaseSearchOperators.AFTER]: "Selecciona fecha y hora",
        [PurchaseSearchOperators.BEFORE]: "Selecciona fecha y hora",
      },
    },
    {
      id: PurchaseSearchFields.DOCUMENT_TYPE,
      label: "Documento",
      kind: "catalog",
      description: "Selecciona uno o varios tipos y define si se incluyen o excluyen.",
      operators: [{ id: PurchaseSearchOperators.IN, label: "Es alguno de" }],
      supportsExclude: true,
      options: searchState?.catalogs.documentTypes ?? [],
    },
    {
      id: PurchaseSearchFields.NUMBER,
      label: "Numero",
      kind: "text",
      description: "Permite buscar por coincidencia o igualdad exacta.",
      operators: TEXT_OPERATOR_OPTIONS,
      placeholder: "Ej. F001-123 o 123",
    },
    {
      id: PurchaseSearchFields.SUPPLIER_ID,
      label: "Proveedor",
      kind: "catalog",
      description: "Selecciona uno o varios proveedores para incluir o excluir.",
      operators: [{ id: PurchaseSearchOperators.IN, label: "Es alguno de" }],
      supportsExclude: true,
      options: searchState?.catalogs.suppliers ?? [],
    },
    {
      id: PurchaseSearchFields.WAREHOUSE_ID,
      label: "Almacen",
      kind: "catalog",
      description: "Selecciona uno o varios almacenes para incluir o excluir.",
      operators: [{ id: PurchaseSearchOperators.IN, label: "Es alguno de" }],
      supportsExclude: true,
      options: searchState?.catalogs.warehouses ?? [],
    },
    {
      id: PurchaseSearchFields.PAYMENT_FORM,
      label: "Forma",
      kind: "catalog",
      description: "Selecciona una o varias formas de pago.",
      operators: [{ id: PurchaseSearchOperators.IN, label: "Es alguno de" }],
      supportsExclude: true,
      options: searchState?.catalogs.paymentForms ?? [],
    },
    {
      id: PurchaseSearchFields.TOTAL,
      label: "Total",
      kind: "number",
      description: "Compara el monto total con una condicion numerica.",
      operators: NUMBER_OPERATOR_OPTIONS,
      placeholder: "Ej. 1000",
    },
    {
      id: PurchaseSearchFields.TOTAL_PAID,
      label: "Pagado",
      kind: "number",
      description: "Compara el monto pagado con una condicion numerica.",
      operators: NUMBER_OPERATOR_OPTIONS,
      placeholder: "Ej. 500",
    },
    {
      id: PurchaseSearchFields.TOTAL_TO_PAY,
      label: "Pendiente",
      kind: "number",
      description: "Compara el monto pendiente con una condicion numerica.",
      operators: NUMBER_OPERATOR_OPTIONS,
      placeholder: "Ej. 250",
    },
    {
      id: PurchaseSearchFields.STATUS,
      label: "Estado",
      kind: "catalog",
      description: "Selecciona estados para incluir o excluir del resultado.",
      operators: [{ id: PurchaseSearchOperators.IN, label: "Es alguno de" }],
      supportsExclude: true,
      options: searchState?.catalogs.statuses ?? [],
    },
    {
      id: PurchaseSearchFields.WAIT_TIME,
      label: "T. Espera",
      kind: "catalog",
      description: "Selecciona estados del tiempo de espera y define si se incluyen o excluyen.",
      operators: [{ id: PurchaseSearchOperators.IN, label: "Es alguno de" }],
      supportsExclude: true,
      options: WAIT_TIME_OPTIONS,
    },
    {
      id: PurchaseSearchFields.EXPECTED_AT,
      label: "Ing. Almacen",
      kind: "date",
      description: "Busca por ingreso a almacen con fecha o fecha y hora segun la condicion.",
      operators: DATE_OPERATOR_OPTIONS,
      operatorInputMode: {
        [PurchaseSearchOperators.ON]: "date",
        [PurchaseSearchOperators.AFTER]: "datetime",
        [PurchaseSearchOperators.BEFORE]: "datetime",
        [PurchaseSearchOperators.BETWEEN]: "date-range",
      },
      operatorPlaceholder: {
        [PurchaseSearchOperators.ON]: "Selecciona una fecha",
        [PurchaseSearchOperators.AFTER]: "Selecciona fecha y hora",
        [PurchaseSearchOperators.BEFORE]: "Selecciona fecha y hora",
      },
    },
  ];
}

export function clonePurchaseRecentSearches(value: PurchaseRecentSearch[] | undefined) {
  return [...(value ?? [])];
}

export function clonePurchaseSavedMetrics(value: PurchaseSavedMetric[] | undefined) {
  return [...(value ?? [])];
}
