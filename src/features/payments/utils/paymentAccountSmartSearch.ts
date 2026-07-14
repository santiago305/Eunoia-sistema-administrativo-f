import type {
  DataTableSearchChip,
  DataTableSearchOption,
  SmartSearchFieldConfig,
  SmartSearchOperatorOption,
} from "@/shared/components/table/search";
import {
  PaymentAccountSearchFields,
  PaymentAccountSearchOperators,
  type PaymentAccountSearchField,
  type PaymentAccountSearchOperator,
  type PaymentAccountSearchRule,
  type PaymentAccountSearchSnapshot,
  type PaymentAccountSearchStateResponse,
} from "../types/payment-account-search.types";

export type PaymentAccountSearchFilterKey = PaymentAccountSearchField;
export type PaymentAccountSearchChip = DataTableSearchChip<PaymentAccountSearchFilterKey>;
export type PaymentAccountSmartSearchColumn = SmartSearchFieldConfig<
  PaymentAccountSearchFilterKey,
  PaymentAccountSearchOperator
>;

const FIELD_ORDER: PaymentAccountSearchField[] = [
  PaymentAccountSearchFields.TYPE,
  PaymentAccountSearchFields.STATUS,
  PaymentAccountSearchFields.CURRENCY,
  PaymentAccountSearchFields.DEFAULT,
];

const FIELD_LABELS: Record<PaymentAccountSearchField, string> = {
  [PaymentAccountSearchFields.TYPE]: "Tipo",
  [PaymentAccountSearchFields.STATUS]: "Estado",
  [PaymentAccountSearchFields.CURRENCY]: "Moneda",
  [PaymentAccountSearchFields.DEFAULT]: "Predeterminada",
};

export const PAYMENT_ACCOUNT_TYPE_OPTIONS: DataTableSearchOption[] = [
  { id: "BANK_ACCOUNT", label: "Cuenta bancaria" },
  { id: "CREDIT_CARD", label: "Tarjeta de credito" },
  { id: "CASH", label: "Caja" },
  { id: "DIGITAL_WALLET", label: "Billetera digital" },
];

export const PAYMENT_ACCOUNT_STATUS_OPTIONS: DataTableSearchOption[] = [
  { id: "ACTIVE", label: "Activas" },
  { id: "INACTIVE", label: "Inactivas" },
];

export const PAYMENT_ACCOUNT_CURRENCY_OPTIONS: DataTableSearchOption[] = [
  { id: "PEN", label: "Soles" },
  { id: "USD", label: "Dolares" },
];

export const PAYMENT_ACCOUNT_DEFAULT_OPTIONS: DataTableSearchOption[] = [
  { id: "DEFAULT", label: "Predeterminadas" },
  { id: "NOT_DEFAULT", label: "No predeterminadas" },
];

const SEARCH_STATE: PaymentAccountSearchStateResponse = {
  recent: [],
  saved: [],
  catalogs: {
    types: PAYMENT_ACCOUNT_TYPE_OPTIONS,
    statuses: PAYMENT_ACCOUNT_STATUS_OPTIONS,
    currencies: PAYMENT_ACCOUNT_CURRENCY_OPTIONS,
    defaults: PAYMENT_ACCOUNT_DEFAULT_OPTIONS,
  },
};

const CATALOG_OPERATOR_OPTIONS: SmartSearchOperatorOption<PaymentAccountSearchOperator>[] = [
  { id: PaymentAccountSearchOperators.IN, label: "Es alguno de" },
];

function uniqueStrings(values: string[] | undefined) {
  return Array.from(new Set((values ?? []).map((value) => value?.trim()).filter(Boolean))) as string[];
}

function sanitizeRule(rule?: Partial<PaymentAccountSearchRule> | null): PaymentAccountSearchRule | null {
  if (!rule?.field || rule.operator !== PaymentAccountSearchOperators.IN) return null;
  if (!Object.values(PaymentAccountSearchFields).includes(rule.field)) return null;
  const values = uniqueStrings(rule.values);
  if (!values.length) return null;
  return {
    field: rule.field,
    operator: PaymentAccountSearchOperators.IN,
    mode: rule.mode === "exclude" ? "exclude" : "include",
    values,
  };
}

function getCatalogOptions(field: PaymentAccountSearchField, searchState?: PaymentAccountSearchStateResponse | null) {
  const state = searchState ?? SEARCH_STATE;
  if (field === PaymentAccountSearchFields.TYPE) return state.catalogs.types;
  if (field === PaymentAccountSearchFields.STATUS) return state.catalogs.statuses;
  if (field === PaymentAccountSearchFields.CURRENCY) return state.catalogs.currencies;
  return state.catalogs.defaults;
}

function getRuleLabel(
  rule: PaymentAccountSearchRule,
  searchState?: PaymentAccountSearchStateResponse | null,
  includeFieldLabel = true,
) {
  const optionMap = new Map(getCatalogOptions(rule.field, searchState).map((item) => [item.id, item.label]));
  const labels = (rule.values ?? []).map((value) => optionMap.get(value) ?? value);
  const prefix =
    rule.mode === "exclude"
      ? includeFieldLabel
        ? `${FIELD_LABELS[rule.field]} excluye: `
        : "Excluye: "
      : includeFieldLabel
        ? `${FIELD_LABELS[rule.field]}: `
        : "";
  return `${prefix}${labels.join(" - ")}`;
}

export function createEmptyPaymentAccountSearchFilters(): PaymentAccountSearchRule[] {
  return [];
}

export function getDefaultPaymentAccountSearchState(): PaymentAccountSearchStateResponse {
  return SEARCH_STATE;
}

export function sanitizePaymentAccountSearchSnapshot(
  snapshot?: Partial<PaymentAccountSearchSnapshot> | { q?: string; filters?: unknown } | null,
): PaymentAccountSearchSnapshot {
  const q = snapshot?.q?.trim();
  const rawFilters = Array.isArray(snapshot?.filters) ? snapshot.filters : [];
  const mergedByField = new Map<PaymentAccountSearchField, PaymentAccountSearchRule>();

  rawFilters.forEach((rule) => {
    const normalized = sanitizeRule(rule as PaymentAccountSearchRule);
    if (!normalized) return;
    mergedByField.set(normalized.field, normalized);
  });

  return {
    q: q || undefined,
    filters: FIELD_ORDER.map((field) => mergedByField.get(field)).filter(Boolean) as PaymentAccountSearchRule[],
  };
}

export function hasPaymentAccountSearchCriteria(snapshot: PaymentAccountSearchSnapshot) {
  const normalized = sanitizePaymentAccountSearchSnapshot(snapshot);
  return Boolean(normalized.q || normalized.filters.length);
}

export function findPaymentAccountSearchRule(
  snapshot: PaymentAccountSearchSnapshot,
  key: PaymentAccountSearchFilterKey,
) {
  return sanitizePaymentAccountSearchSnapshot(snapshot).filters.find((rule) => rule.field === key) ?? null;
}

export function upsertPaymentAccountSearchRule(
  snapshot: PaymentAccountSearchSnapshot,
  rule: PaymentAccountSearchRule,
) {
  const normalized = sanitizePaymentAccountSearchSnapshot(snapshot);
  return sanitizePaymentAccountSearchSnapshot({
    ...normalized,
    filters: [...normalized.filters.filter((item) => item.field !== rule.field), rule],
  });
}

export function removePaymentAccountSearchKey(
  snapshot: PaymentAccountSearchSnapshot,
  key: "q" | PaymentAccountSearchFilterKey,
) {
  const normalized = sanitizePaymentAccountSearchSnapshot(snapshot);
  if (key === "q") return sanitizePaymentAccountSearchSnapshot({ ...normalized, q: undefined });
  return sanitizePaymentAccountSearchSnapshot({
    ...normalized,
    filters: normalized.filters.filter((rule) => rule.field !== key),
  });
}

export function buildPaymentAccountSearchChips(
  snapshot: PaymentAccountSearchSnapshot,
  searchState?: PaymentAccountSearchStateResponse | null,
): PaymentAccountSearchChip[] {
  const normalized = sanitizePaymentAccountSearchSnapshot(snapshot);
  const chips: PaymentAccountSearchChip[] = [];
  if (normalized.q) chips.push({ id: "q", label: `Busqueda: ${normalized.q}`, removeKey: "q" });
  normalized.filters.forEach((rule) => chips.push({ id: rule.field, label: getRuleLabel(rule, searchState), removeKey: rule.field }));
  return chips;
}

export function getPaymentAccountSearchSelectionCount(
  snapshot: PaymentAccountSearchSnapshot,
  key: PaymentAccountSearchFilterKey,
) {
  return findPaymentAccountSearchRule(snapshot, key)?.values?.length ?? 0;
}

export function getPaymentAccountSearchRuleSummary(
  snapshot: PaymentAccountSearchSnapshot,
  key: PaymentAccountSearchFilterKey,
  searchState?: PaymentAccountSearchStateResponse | null,
) {
  const rule = findPaymentAccountSearchRule(snapshot, key);
  return rule ? getRuleLabel(rule, searchState, false) : null;
}

export function buildPaymentAccountSmartSearchColumns(
  searchState?: PaymentAccountSearchStateResponse | null,
): PaymentAccountSmartSearchColumn[] {
  const state = searchState ?? SEARCH_STATE;
  return [
    {
      id: PaymentAccountSearchFields.TYPE,
      label: "Tipo",
      kind: "catalog",
      description: "Filtra cuentas bancarias, tarjetas, cajas o billeteras.",
      operators: CATALOG_OPERATOR_OPTIONS,
      supportsExclude: true,
      options: state.catalogs.types,
    },
    {
      id: PaymentAccountSearchFields.STATUS,
      label: "Estado",
      kind: "catalog",
      description: "Filtra cuentas activas o inactivas.",
      operators: CATALOG_OPERATOR_OPTIONS,
      supportsExclude: true,
      options: state.catalogs.statuses,
    },
    {
      id: PaymentAccountSearchFields.CURRENCY,
      label: "Moneda",
      kind: "catalog",
      description: "Filtra por moneda operativa.",
      operators: CATALOG_OPERATOR_OPTIONS,
      supportsExclude: true,
      options: state.catalogs.currencies,
    },
    {
      id: PaymentAccountSearchFields.DEFAULT,
      label: "Predeterminada",
      kind: "catalog",
      description: "Filtra cuentas predeterminadas y secundarias.",
      operators: CATALOG_OPERATOR_OPTIONS,
      supportsExclude: true,
      options: state.catalogs.defaults,
    },
  ];
}
