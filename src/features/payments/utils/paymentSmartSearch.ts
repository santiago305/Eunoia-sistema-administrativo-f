import type {
  DataTableSearchChip,
  DataTableSearchOption,
  SmartSearchFieldConfig,
  SmartSearchOperatorOption,
} from "@/shared/components/table/search";
import {
  PaymentSearchFields,
  PaymentSearchOperators,
  type PaymentRecentSearch,
  type PaymentSavedMetric,
  type PaymentSearchField,
  type PaymentSearchFilters,
  type PaymentSearchOperator,
  type PaymentSearchRule,
  type PaymentSearchSnapshot,
  type PaymentSearchStateResponse,
} from "../types/payment-search.types";

export type PaymentSearchFilterKey = PaymentSearchField;

export type PaymentSearchChip = DataTableSearchChip<PaymentSearchFilterKey>;

export type PaymentSmartSearchColumn = SmartSearchFieldConfig<
  PaymentSearchFilterKey,
  PaymentSearchOperator
>;

type PaymentSearchOperatorOption = SmartSearchOperatorOption<PaymentSearchOperator>;

const FIELD_ORDER: PaymentSearchField[] = [
  PaymentSearchFields.STATUS,
  PaymentSearchFields.CURRENCY,
  PaymentSearchFields.PAYMENT_METHOD_ID,
  PaymentSearchFields.COMPANY_PAYMENT_ACCOUNT_ID,
  PaymentSearchFields.FROM_DOCUMENT_TYPE,
  PaymentSearchFields.AMOUNT,
  PaymentSearchFields.DATE,
  PaymentSearchFields.SCHEDULED_AT,
  PaymentSearchFields.PAID_AT,
  PaymentSearchFields.HAS_EVIDENCE,
  PaymentSearchFields.REQUESTED_BY_USER_ID,
  PaymentSearchFields.APPROVED_BY_USER_ID,
];

const FIELD_LABELS: Record<PaymentSearchField, string> = {
  [PaymentSearchFields.STATUS]: "Estado",
  [PaymentSearchFields.CURRENCY]: "Moneda",
  [PaymentSearchFields.PAYMENT_METHOD_ID]: "Metodo",
  [PaymentSearchFields.COMPANY_PAYMENT_ACCOUNT_ID]: "Cuenta empresa",
  [PaymentSearchFields.FROM_DOCUMENT_TYPE]: "Origen",
  [PaymentSearchFields.AMOUNT]: "Monto",
  [PaymentSearchFields.DATE]: "Fecha documento",
  [PaymentSearchFields.SCHEDULED_AT]: "Fecha programada",
  [PaymentSearchFields.PAID_AT]: "Fecha pagada",
  [PaymentSearchFields.HAS_EVIDENCE]: "Evidencia",
  [PaymentSearchFields.REQUESTED_BY_USER_ID]: "Solicitante",
  [PaymentSearchFields.APPROVED_BY_USER_ID]: "Aprobador",
};

const CATALOG_FIELDS = new Set<PaymentSearchField>([
  PaymentSearchFields.STATUS,
  PaymentSearchFields.CURRENCY,
  PaymentSearchFields.PAYMENT_METHOD_ID,
  PaymentSearchFields.COMPANY_PAYMENT_ACCOUNT_ID,
  PaymentSearchFields.FROM_DOCUMENT_TYPE,
  PaymentSearchFields.HAS_EVIDENCE,
  PaymentSearchFields.REQUESTED_BY_USER_ID,
  PaymentSearchFields.APPROVED_BY_USER_ID,
]);

const NUMERIC_FIELDS = new Set<PaymentSearchField>([
  PaymentSearchFields.AMOUNT,
]);

const DATE_FIELDS = new Set<PaymentSearchField>([
  PaymentSearchFields.DATE,
  PaymentSearchFields.SCHEDULED_AT,
  PaymentSearchFields.PAID_AT,
]);

const NUMERIC_OPERATORS = new Set<PaymentSearchOperator>([
  PaymentSearchOperators.EQ,
  PaymentSearchOperators.GT,
  PaymentSearchOperators.GTE,
  PaymentSearchOperators.LT,
  PaymentSearchOperators.LTE,
]);

const DATE_OPERATORS = new Set<PaymentSearchOperator>([
  PaymentSearchOperators.ON,
  PaymentSearchOperators.AFTER,
  PaymentSearchOperators.BEFORE,
  PaymentSearchOperators.BETWEEN,
  PaymentSearchOperators.ON_OR_AFTER,
  PaymentSearchOperators.ON_OR_BEFORE,
]);

const NUMBER_OPERATOR_OPTIONS: PaymentSearchOperatorOption[] = [
  { id: PaymentSearchOperators.EQ, label: "Igual a" },
  { id: PaymentSearchOperators.GT, label: "Mayor que" },
  { id: PaymentSearchOperators.GTE, label: "Mayor o igual" },
  { id: PaymentSearchOperators.LT, label: "Menor que" },
  { id: PaymentSearchOperators.LTE, label: "Menor o igual" },
];

const DATE_OPERATOR_OPTIONS: PaymentSearchOperatorOption[] = [
  { id: PaymentSearchOperators.ON, label: "Es" },
  { id: PaymentSearchOperators.AFTER, label: "Despues de" },
  { id: PaymentSearchOperators.BEFORE, label: "Antes de" },
  { id: PaymentSearchOperators.BETWEEN, label: "Entre" },
];

const OPERATOR_LABELS: Record<PaymentSearchOperator, string> = {
  [PaymentSearchOperators.IN]: ":",
  [PaymentSearchOperators.EQ]: "=",
  [PaymentSearchOperators.GT]: ">",
  [PaymentSearchOperators.GTE]: ">=",
  [PaymentSearchOperators.LT]: "<",
  [PaymentSearchOperators.LTE]: "<=",
  [PaymentSearchOperators.ON]: "=",
  [PaymentSearchOperators.BEFORE]: "<",
  [PaymentSearchOperators.AFTER]: ">",
  [PaymentSearchOperators.BETWEEN]: "entre",
  [PaymentSearchOperators.ON_OR_BEFORE]: "<=",
  [PaymentSearchOperators.ON_OR_AFTER]: ">=",
};

const FALLBACK_STATUS_OPTIONS: DataTableSearchOption[] = [
  { id: "SCHEDULED", label: "Programado", keywords: ["programado", "agenda"] },
  { id: "PENDING_APPROVAL", label: "Pendiente aprobacion", keywords: ["pendiente", "aprobar"] },
  { id: "APPROVED", label: "Aprobado", keywords: ["aprobado", "pagado"] },
  { id: "REJECTED", label: "Rechazado", keywords: ["rechazado", "observado"] },
];

const FALLBACK_CURRENCY_OPTIONS: DataTableSearchOption[] = [
  { id: "PEN", label: "Soles", keywords: ["soles"] },
  { id: "USD", label: "Dolares", keywords: ["dolares"] },
];

const FALLBACK_DOCUMENT_TYPE_OPTIONS: DataTableSearchOption[] = [
  { id: "PURCHASE", label: "Compra", keywords: ["compra", "orden"] },
  { id: "SALE", label: "Venta", keywords: ["venta"] },
];

const FALLBACK_EVIDENCE_OPTIONS: DataTableSearchOption[] = [
  { id: "true", label: "Con evidencia", keywords: ["voucher", "adjunto", "evidencia"] },
  { id: "false", label: "Sin evidencia", keywords: ["pendiente", "sin voucher"] },
];

function uniqueStrings(values: string[] | undefined) {
  return Array.from(new Set((values ?? []).map((value) => value?.trim()).filter(Boolean))) as string[];
}

function normalizeDateValue(value?: string | null) {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString().slice(0, 10);
}

function formatRuleValueLabel(value?: string | null) {
  const trimmed = value?.trim();
  if (!trimmed) return "";
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return trimmed;
  return `${String(parsed.getDate()).padStart(2, "0")}/${String(
    parsed.getMonth() + 1,
  ).padStart(2, "0")}/${parsed.getFullYear()}`;
}

function sanitizeRule(rule?: Partial<PaymentSearchRule> | null): PaymentSearchRule | null {
  if (!rule?.field || !rule.operator) return null;

  const field = rule.field;
  const operator = rule.operator;

  if (!Object.values(PaymentSearchFields).includes(field)) return null;
  if (!Object.values(PaymentSearchOperators).includes(operator)) return null;

  if (CATALOG_FIELDS.has(field)) {
    if (operator !== PaymentSearchOperators.IN) return null;
    const values = uniqueStrings(rule.values ?? (rule.value ? [rule.value] : undefined));
    if (!values.length) return null;
    const mode = rule.mode === "exclude" ? "exclude" : "include";
    return { field, operator, mode, values };
  }

  if (NUMERIC_FIELDS.has(field)) {
    if (!NUMERIC_OPERATORS.has(operator)) return null;
    const value = rule.value?.trim();
    if (!value || Number.isNaN(Number(value))) return null;
    return { field, operator, value };
  }

  if (DATE_FIELDS.has(field)) {
    if (!DATE_OPERATORS.has(operator)) return null;

    if (operator === PaymentSearchOperators.BETWEEN) {
      const start = normalizeDateValue(rule.range?.start);
      const end = normalizeDateValue(rule.range?.end);
      if (!start || !end) return null;
      const [first, second] = [start, end].sort();
      return {
        field,
        operator,
        range: { start: first, end: second },
      };
    }

    const value = normalizeDateValue(rule.value);
    if (!value) return null;
    return { field, operator, value };
  }

  return null;
}

function getCatalogMaps(searchState?: PaymentSearchStateResponse | null) {
  return {
    status: new Map((searchState?.catalogs.statuses ?? FALLBACK_STATUS_OPTIONS).map((item) => [item.id, item.label])),
    currency: new Map((searchState?.catalogs.currencies ?? FALLBACK_CURRENCY_OPTIONS).map((item) => [item.id, item.label])),
    paymentMethodId: new Map(searchState?.catalogs.paymentMethods.map((item) => [item.id, item.label]) ?? []),
    companyPaymentAccountId: new Map(searchState?.catalogs.companyPaymentAccounts.map((item) => [item.id, item.label]) ?? []),
    fromDocumentType: new Map(
      (searchState?.catalogs.documentTypes ?? FALLBACK_DOCUMENT_TYPE_OPTIONS).map((item) => [item.id, item.label]),
    ),
    hasEvidence: new Map(
      (searchState?.catalogs.evidenceStates ?? FALLBACK_EVIDENCE_OPTIONS).map((item) => [item.id, item.label]),
    ),
    requestedByUserId: new Map<string, string>(),
    approvedByUserId: new Map<string, string>(),
  };
}

function getCatalogLabels(
  field: PaymentSearchField,
  values: string[],
  searchState?: PaymentSearchStateResponse | null,
) {
  const maps = getCatalogMaps(searchState);
  const map =
    field === PaymentSearchFields.STATUS ? maps.status :
    field === PaymentSearchFields.CURRENCY ? maps.currency :
    field === PaymentSearchFields.PAYMENT_METHOD_ID ? maps.paymentMethodId :
    field === PaymentSearchFields.COMPANY_PAYMENT_ACCOUNT_ID ? maps.companyPaymentAccountId :
    field === PaymentSearchFields.FROM_DOCUMENT_TYPE ? maps.fromDocumentType :
    field === PaymentSearchFields.HAS_EVIDENCE ? maps.hasEvidence :
    field === PaymentSearchFields.REQUESTED_BY_USER_ID ? maps.requestedByUserId :
    field === PaymentSearchFields.APPROVED_BY_USER_ID ? maps.approvedByUserId :
    new Map<string, string>();
  return values.map((value) => map.get(value) ?? value);
}

function getRuleLabel(
  rule: PaymentSearchRule,
  searchState?: PaymentSearchStateResponse | null,
  includeFieldLabel = true,
) {
  const fieldLabel = FIELD_LABELS[rule.field];

  if (rule.operator === PaymentSearchOperators.IN) {
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

  if (rule.operator === PaymentSearchOperators.BETWEEN) {
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

function getCatalogOptions(
  searchState: PaymentSearchStateResponse | null | undefined,
  key: keyof PaymentSearchStateResponse["catalogs"],
  fallback: DataTableSearchOption[] = [],
) {
  const values = searchState?.catalogs[key];
  return values?.length ? values : fallback;
}

export function createEmptyPaymentSearchFilters(): PaymentSearchFilters {
  return [];
}

export function createEmptyPaymentSearchSnapshot(): PaymentSearchSnapshot {
  return {
    filters: createEmptyPaymentSearchFilters(),
  };
}

export function sanitizePaymentSearchSnapshot(
  snapshot?: Partial<PaymentSearchSnapshot> | { q?: string; filters?: unknown } | null,
): PaymentSearchSnapshot {
  const q = snapshot?.q?.trim();
  const rawFilters = Array.isArray(snapshot?.filters) ? snapshot.filters : [];
  const mergedByField = new Map<PaymentSearchField, PaymentSearchRule>();

  rawFilters.forEach((rule) => {
    const normalized = sanitizeRule(rule as PaymentSearchRule);
    if (!normalized) return;

    const existing = mergedByField.get(normalized.field);
    if (
      normalized.operator === PaymentSearchOperators.IN &&
      existing?.operator === PaymentSearchOperators.IN
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
    filters: FIELD_ORDER.map((field) => mergedByField.get(field)).filter(Boolean) as PaymentSearchRule[],
  };
}

export function hasPaymentSearchCriteria(snapshot: PaymentSearchSnapshot) {
  return Boolean(snapshot.q || snapshot.filters.length);
}

export function findPaymentSearchRule(
  snapshot: PaymentSearchSnapshot,
  key: PaymentSearchFilterKey,
) {
  return sanitizePaymentSearchSnapshot(snapshot).filters.find((rule) => rule.field === key) ?? null;
}

export function togglePaymentSearchOption(
  snapshot: PaymentSearchSnapshot,
  key: PaymentSearchFilterKey,
  optionId: string,
) {
  const normalized = sanitizePaymentSearchSnapshot(snapshot);
  const existing = findPaymentSearchRule(normalized, key);
  const currentValues = existing?.values ?? [];
  const nextValues = currentValues.includes(optionId)
    ? currentValues.filter((value) => value !== optionId)
    : [...currentValues, optionId];

  return sanitizePaymentSearchSnapshot({
    ...normalized,
    filters: [
      ...normalized.filters.filter((rule) => rule.field !== key),
      ...(nextValues.length
        ? [
            {
              field: key,
              operator: PaymentSearchOperators.IN,
              mode: existing?.mode ?? "include",
              values: nextValues,
            },
          ]
        : []),
    ],
  });
}

export function upsertPaymentSearchRule(
  snapshot: PaymentSearchSnapshot,
  rule: PaymentSearchRule,
) {
  const normalized = sanitizePaymentSearchSnapshot(snapshot);
  return sanitizePaymentSearchSnapshot({
    ...normalized,
    filters: [
      ...normalized.filters.filter((item) => item.field !== rule.field),
      rule,
    ],
  });
}

export function removePaymentSearchKey(
  snapshot: PaymentSearchSnapshot,
  key: "q" | PaymentSearchFilterKey,
) {
  const normalized = sanitizePaymentSearchSnapshot(snapshot);

  if (key === "q") {
    return sanitizePaymentSearchSnapshot({
      ...normalized,
      q: undefined,
    });
  }

  return sanitizePaymentSearchSnapshot({
    ...normalized,
    filters: normalized.filters.filter((rule) => rule.field !== key),
  });
}

export function buildPaymentSearchLabel(
  snapshot: PaymentSearchSnapshot,
  searchState?: PaymentSearchStateResponse | null,
) {
  const normalized = sanitizePaymentSearchSnapshot(snapshot);
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

export function buildPaymentSearchChips(
  snapshot: PaymentSearchSnapshot,
  searchState?: PaymentSearchStateResponse | null,
): PaymentSearchChip[] {
  const normalized = sanitizePaymentSearchSnapshot(snapshot);
  const chips: PaymentSearchChip[] = [];

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

export function getPaymentSearchSelectionCount(
  snapshot: PaymentSearchSnapshot,
  key: PaymentSearchFilterKey,
) {
  const rule = findPaymentSearchRule(snapshot, key);
  if (!rule) return 0;
  return rule.operator === PaymentSearchOperators.IN ? rule.values?.length ?? 0 : 1;
}

export function getPaymentSearchRuleSummary(
  snapshot: PaymentSearchSnapshot,
  key: PaymentSearchFilterKey,
  searchState?: PaymentSearchStateResponse | null,
) {
  const rule = findPaymentSearchRule(snapshot, key);
  if (!rule) return null;
  return getRuleLabel(rule, searchState, false);
}

export function buildPaymentSmartSearchColumns(
  searchState?: PaymentSearchStateResponse | null,
): PaymentSmartSearchColumn[] {
  const catalogOperator = [{ id: PaymentSearchOperators.IN, label: "Es alguno de" }];

  return [
    {
      id: PaymentSearchFields.STATUS,
      label: "Estado",
      kind: "catalog",
      description: "Selecciona estados para incluir o excluir del resultado.",
      operators: catalogOperator,
      supportsExclude: true,
      options: getCatalogOptions(searchState, "statuses", FALLBACK_STATUS_OPTIONS),
    },
    {
      id: PaymentSearchFields.CURRENCY,
      label: "Moneda",
      kind: "catalog",
      description: "Filtra pagos por moneda.",
      operators: catalogOperator,
      supportsExclude: true,
      options: getCatalogOptions(searchState, "currencies", FALLBACK_CURRENCY_OPTIONS),
    },
    {
      id: PaymentSearchFields.PAYMENT_METHOD_ID,
      label: "Metodo",
      kind: "catalog",
      description: "Selecciona uno o varios metodos de pago.",
      operators: catalogOperator,
      supportsExclude: true,
      options: getCatalogOptions(searchState, "paymentMethods"),
    },
    {
      id: PaymentSearchFields.COMPANY_PAYMENT_ACCOUNT_ID,
      label: "Cuenta empresa",
      kind: "catalog",
      description: "Selecciona cuentas internas usadas para pagar.",
      operators: catalogOperator,
      supportsExclude: true,
      options: getCatalogOptions(searchState, "companyPaymentAccounts"),
    },
    {
      id: PaymentSearchFields.FROM_DOCUMENT_TYPE,
      label: "Origen",
      kind: "catalog",
      description: "Filtra por el documento que origino el pago.",
      operators: catalogOperator,
      supportsExclude: true,
      options: getCatalogOptions(searchState, "documentTypes", FALLBACK_DOCUMENT_TYPE_OPTIONS),
    },
    {
      id: PaymentSearchFields.AMOUNT,
      label: "Monto",
      kind: "number",
      description: "Compara el monto pagado con una condicion numerica.",
      operators: NUMBER_OPERATOR_OPTIONS,
      placeholder: "Ej. 1000",
    },
    {
      id: PaymentSearchFields.DATE,
      label: "Fecha documento",
      kind: "date",
      description: "Busca por fecha registrada del pago.",
      operators: DATE_OPERATOR_OPTIONS,
      operatorInputMode: {
        [PaymentSearchOperators.ON]: "date",
        [PaymentSearchOperators.AFTER]: "date",
        [PaymentSearchOperators.BEFORE]: "date",
        [PaymentSearchOperators.BETWEEN]: "date-range",
      },
    },
    {
      id: PaymentSearchFields.SCHEDULED_AT,
      label: "Fecha programada",
      kind: "date",
      description: "Busca pagos programados por fecha.",
      operators: DATE_OPERATOR_OPTIONS,
      operatorInputMode: {
        [PaymentSearchOperators.ON]: "date",
        [PaymentSearchOperators.AFTER]: "date",
        [PaymentSearchOperators.BEFORE]: "date",
        [PaymentSearchOperators.BETWEEN]: "date-range",
      },
    },
    {
      id: PaymentSearchFields.PAID_AT,
      label: "Fecha pagada",
      kind: "date",
      description: "Busca pagos aprobados o pagados por fecha.",
      operators: DATE_OPERATOR_OPTIONS,
      operatorInputMode: {
        [PaymentSearchOperators.ON]: "date",
        [PaymentSearchOperators.AFTER]: "date",
        [PaymentSearchOperators.BEFORE]: "date",
        [PaymentSearchOperators.BETWEEN]: "date-range",
      },
    },
    {
      id: PaymentSearchFields.HAS_EVIDENCE,
      label: "Evidencia",
      kind: "catalog",
      description: "Filtra pagos con o sin comprobante adjunto.",
      operators: catalogOperator,
      supportsExclude: true,
      options: getCatalogOptions(searchState, "evidenceStates", FALLBACK_EVIDENCE_OPTIONS),
    },
    {
      id: PaymentSearchFields.REQUESTED_BY_USER_ID,
      label: "Solicitante",
      kind: "catalog",
      description: "Filtra por usuario solicitante cuando exista el catalogo.",
      operators: catalogOperator,
      supportsExclude: true,
      options: [],
    },
    {
      id: PaymentSearchFields.APPROVED_BY_USER_ID,
      label: "Aprobador",
      kind: "catalog",
      description: "Filtra por usuario aprobador cuando exista el catalogo.",
      operators: catalogOperator,
      supportsExclude: true,
      options: [],
    },
  ];
}

export function clonePaymentRecentSearches(value: PaymentRecentSearch[] | undefined) {
  return [...(value ?? [])];
}

export function clonePaymentSavedMetrics(value: PaymentSavedMetric[] | undefined) {
  return [...(value ?? [])];
}
