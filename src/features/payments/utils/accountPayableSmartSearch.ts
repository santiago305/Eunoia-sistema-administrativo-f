import type {
  DataTableSearchChip,
  DataTableSearchOption,
  SmartSearchFieldConfig,
  SmartSearchOperatorOption,
} from "@/shared/components/table/search";
import type { ListAccountPayablesQuery } from "../types/payable.types";
import {
  AccountPayableSearchFields,
  AccountPayableSearchOperators,
  type AccountPayableSearchField,
  type AccountPayableSearchFilters,
  type AccountPayableSearchOperator,
  type AccountPayableSearchRule,
  type AccountPayableSearchSnapshot,
  type AccountPayableSearchStateResponse,
} from "../types/account-payable-search.types";

export type AccountPayableSearchFilterKey = AccountPayableSearchField;

export type AccountPayableSearchChip = DataTableSearchChip<AccountPayableSearchFilterKey>;

export type AccountPayableSmartSearchColumn = SmartSearchFieldConfig<
  AccountPayableSearchFilterKey,
  AccountPayableSearchOperator
>;

type AccountPayableSearchOperatorOption = SmartSearchOperatorOption<AccountPayableSearchOperator>;

const FIELD_ORDER: AccountPayableSearchField[] = [
  AccountPayableSearchFields.STATUS,
  AccountPayableSearchFields.PURCHASE_ID,
  AccountPayableSearchFields.SUPPLIER_ID,
  AccountPayableSearchFields.CURRENCY,
  AccountPayableSearchFields.AMOUNT_PENDING,
  AccountPayableSearchFields.DUE_DATE,
];

const FIELD_LABELS: Record<AccountPayableSearchField, string> = {
  [AccountPayableSearchFields.STATUS]: "Estado",
  [AccountPayableSearchFields.PURCHASE_ID]: "Compra",
  [AccountPayableSearchFields.SUPPLIER_ID]: "Proveedor",
  [AccountPayableSearchFields.CURRENCY]: "Moneda",
  [AccountPayableSearchFields.AMOUNT_PENDING]: "Saldo pendiente",
  [AccountPayableSearchFields.DUE_DATE]: "Vencimiento",
};

const CATALOG_FIELDS = new Set<AccountPayableSearchField>([
  AccountPayableSearchFields.STATUS,
  AccountPayableSearchFields.CURRENCY,
]);

const TEXT_FIELDS = new Set<AccountPayableSearchField>([
  AccountPayableSearchFields.PURCHASE_ID,
  AccountPayableSearchFields.SUPPLIER_ID,
]);

const NUMERIC_FIELDS = new Set<AccountPayableSearchField>([
  AccountPayableSearchFields.AMOUNT_PENDING,
]);

const DATE_FIELDS = new Set<AccountPayableSearchField>([
  AccountPayableSearchFields.DUE_DATE,
]);

const NUMERIC_OPERATORS = new Set<AccountPayableSearchOperator>([
  AccountPayableSearchOperators.EQ,
  AccountPayableSearchOperators.GT,
  AccountPayableSearchOperators.GTE,
  AccountPayableSearchOperators.LT,
  AccountPayableSearchOperators.LTE,
]);

const DATE_OPERATORS = new Set<AccountPayableSearchOperator>([
  AccountPayableSearchOperators.ON,
  AccountPayableSearchOperators.AFTER,
  AccountPayableSearchOperators.BEFORE,
  AccountPayableSearchOperators.BETWEEN,
]);

const TEXT_OPERATOR_OPTIONS: AccountPayableSearchOperatorOption[] = [
  { id: AccountPayableSearchOperators.EQ, label: "Es" },
];

const NUMBER_OPERATOR_OPTIONS: AccountPayableSearchOperatorOption[] = [
  { id: AccountPayableSearchOperators.EQ, label: "Igual a" },
  { id: AccountPayableSearchOperators.GT, label: "Mayor que" },
  { id: AccountPayableSearchOperators.GTE, label: "Mayor o igual" },
  { id: AccountPayableSearchOperators.LT, label: "Menor que" },
  { id: AccountPayableSearchOperators.LTE, label: "Menor o igual" },
];

const DATE_OPERATOR_OPTIONS: AccountPayableSearchOperatorOption[] = [
  { id: AccountPayableSearchOperators.ON, label: "Es" },
  { id: AccountPayableSearchOperators.AFTER, label: "Despues de" },
  { id: AccountPayableSearchOperators.BEFORE, label: "Antes de" },
  { id: AccountPayableSearchOperators.BETWEEN, label: "Entre" },
];

const OPERATOR_LABELS: Record<AccountPayableSearchOperator, string> = {
  [AccountPayableSearchOperators.IN]: ":",
  [AccountPayableSearchOperators.EQ]: "=",
  [AccountPayableSearchOperators.GT]: ">",
  [AccountPayableSearchOperators.GTE]: ">=",
  [AccountPayableSearchOperators.LT]: "<",
  [AccountPayableSearchOperators.LTE]: "<=",
  [AccountPayableSearchOperators.ON]: "=",
  [AccountPayableSearchOperators.BEFORE]: "<",
  [AccountPayableSearchOperators.AFTER]: ">",
  [AccountPayableSearchOperators.BETWEEN]: "entre",
};

export const ACCOUNT_PAYABLE_STATUS_OPTIONS: DataTableSearchOption[] = [
  { id: "PENDING", label: "Pendiente", keywords: ["pendiente"] },
  { id: "PARTIAL", label: "Parcial", keywords: ["parcial"] },
  { id: "OVERDUE", label: "Vencida", keywords: ["vencida", "vencido"] },
  { id: "PAID", label: "Pagada", keywords: ["pagada", "pagado"] },
  { id: "CANCELLED", label: "Cancelada", keywords: ["cancelada"] },
];

export const ACCOUNT_PAYABLE_CURRENCY_OPTIONS: DataTableSearchOption[] = [
  { id: "PEN", label: "Soles", keywords: ["soles"] },
  { id: "USD", label: "Dolares", keywords: ["dolares"] },
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

function formatRuleValueLabel(value?: string | null, parseAsDate = false) {
  const trimmed = value?.trim();
  if (!trimmed) return "";
  if (!parseAsDate) return trimmed;
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return trimmed;
  return `${String(parsed.getDate()).padStart(2, "0")}/${String(
    parsed.getMonth() + 1,
  ).padStart(2, "0")}/${parsed.getFullYear()}`;
}

function sanitizeRule(rule?: Partial<AccountPayableSearchRule> | null): AccountPayableSearchRule | null {
  if (!rule?.field || !rule.operator) return null;

  const field = rule.field;
  const operator = rule.operator;

  if (!Object.values(AccountPayableSearchFields).includes(field)) return null;
  if (!Object.values(AccountPayableSearchOperators).includes(operator)) return null;

  if (CATALOG_FIELDS.has(field)) {
    if (operator !== AccountPayableSearchOperators.IN) return null;
    const values = uniqueStrings(rule.values ?? (rule.value ? [rule.value] : undefined));
    if (!values.length) return null;
    const mode = rule.mode === "exclude" ? "exclude" : "include";
    return { field, operator, mode, values };
  }

  if (TEXT_FIELDS.has(field)) {
    if (operator !== AccountPayableSearchOperators.EQ) return null;
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

    if (operator === AccountPayableSearchOperators.BETWEEN) {
      const start = normalizeDateValue(rule.range?.start);
      const end = normalizeDateValue(rule.range?.end);
      if (!start || !end) return null;
      const [first, second] = [start, end].sort();
      return { field, operator, range: { start: first, end: second } };
    }

    const value = normalizeDateValue(rule.value);
    if (!value) return null;
    return { field, operator, value };
  }

  return null;
}

function getCatalogMaps(searchState?: AccountPayableSearchStateResponse | null) {
  return {
    status: new Map((searchState?.catalogs.statuses ?? ACCOUNT_PAYABLE_STATUS_OPTIONS).map((item) => [item.id, item.label])),
    currency: new Map((searchState?.catalogs.currencies ?? ACCOUNT_PAYABLE_CURRENCY_OPTIONS).map((item) => [item.id, item.label])),
  };
}

function getCatalogLabels(
  field: AccountPayableSearchField,
  values: string[],
  searchState?: AccountPayableSearchStateResponse | null,
) {
  const maps = getCatalogMaps(searchState);
  const map =
    field === AccountPayableSearchFields.STATUS ? maps.status :
    field === AccountPayableSearchFields.CURRENCY ? maps.currency :
    new Map<string, string>();

  return values.map((value) => map.get(value) ?? value);
}

function getRuleLabel(
  rule: AccountPayableSearchRule,
  searchState?: AccountPayableSearchStateResponse | null,
  includeFieldLabel = true,
) {
  const fieldLabel = FIELD_LABELS[rule.field];

  if (rule.operator === AccountPayableSearchOperators.IN) {
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

  if (rule.operator === AccountPayableSearchOperators.BETWEEN) {
    if (!rule.range?.start || !rule.range?.end) return includeFieldLabel ? fieldLabel : "";
    const content = `${formatRuleValueLabel(rule.range.start, true)} y ${formatRuleValueLabel(rule.range.end, true)}`;
    return includeFieldLabel
      ? `${fieldLabel} ${OPERATOR_LABELS[rule.operator]} ${content}`
      : `${OPERATOR_LABELS[rule.operator]} ${content}`;
  }

  if (!rule.value) return includeFieldLabel ? fieldLabel : "";
  const content = `${OPERATOR_LABELS[rule.operator]} ${formatRuleValueLabel(rule.value, DATE_FIELDS.has(rule.field))}`;
  return includeFieldLabel ? `${fieldLabel} ${content}` : content;
}

export function createEmptyAccountPayableSearchFilters(): AccountPayableSearchFilters {
  return [];
}

export function sanitizeAccountPayableSearchSnapshot(
  snapshot?: Partial<AccountPayableSearchSnapshot> | { q?: string; filters?: unknown } | null,
): AccountPayableSearchSnapshot {
  const q = snapshot?.q?.trim();
  const rawFilters = Array.isArray(snapshot?.filters) ? snapshot.filters : [];
  const mergedByField = new Map<AccountPayableSearchField, AccountPayableSearchRule>();

  rawFilters.forEach((rule) => {
    const normalized = sanitizeRule(rule as AccountPayableSearchRule);
    if (!normalized) return;

    const existing = mergedByField.get(normalized.field);
    if (
      normalized.operator === AccountPayableSearchOperators.IN &&
      existing?.operator === AccountPayableSearchOperators.IN
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
    filters: FIELD_ORDER.map((field) => mergedByField.get(field)).filter(Boolean) as AccountPayableSearchRule[],
  };
}

export function hasAccountPayableSearchCriteria(snapshot: AccountPayableSearchSnapshot) {
  return Boolean(snapshot.q || snapshot.filters.length);
}

export function findAccountPayableSearchRule(
  snapshot: AccountPayableSearchSnapshot,
  key: AccountPayableSearchFilterKey,
) {
  return sanitizeAccountPayableSearchSnapshot(snapshot).filters.find((rule) => rule.field === key) ?? null;
}

export function upsertAccountPayableSearchRule(
  snapshot: AccountPayableSearchSnapshot,
  rule: AccountPayableSearchRule,
) {
  const normalized = sanitizeAccountPayableSearchSnapshot(snapshot);
  return sanitizeAccountPayableSearchSnapshot({
    ...normalized,
    filters: [
      ...normalized.filters.filter((item) => item.field !== rule.field),
      rule,
    ],
  });
}

export function removeAccountPayableSearchKey(
  snapshot: AccountPayableSearchSnapshot,
  key: "q" | AccountPayableSearchFilterKey,
) {
  const normalized = sanitizeAccountPayableSearchSnapshot(snapshot);

  if (key === "q") {
    return sanitizeAccountPayableSearchSnapshot({ ...normalized, q: undefined });
  }

  return sanitizeAccountPayableSearchSnapshot({
    ...normalized,
    filters: normalized.filters.filter((rule) => rule.field !== key),
  });
}

export function buildAccountPayableSearchChips(
  snapshot: AccountPayableSearchSnapshot,
  searchState?: AccountPayableSearchStateResponse | null,
): AccountPayableSearchChip[] {
  const normalized = sanitizeAccountPayableSearchSnapshot(snapshot);
  const chips: AccountPayableSearchChip[] = [];

  if (normalized.q) {
    chips.push({ id: "q", label: `Busqueda: ${normalized.q}`, removeKey: "q" });
  }

  normalized.filters.forEach((rule) => {
    const label = getRuleLabel(rule, searchState);
    if (!label) return;
    chips.push({ id: rule.field, label, removeKey: rule.field });
  });

  return chips;
}

export function getAccountPayableSearchSelectionCount(
  snapshot: AccountPayableSearchSnapshot,
  key: AccountPayableSearchFilterKey,
) {
  const rule = findAccountPayableSearchRule(snapshot, key);
  if (!rule) return 0;
  return rule.operator === AccountPayableSearchOperators.IN ? rule.values?.length ?? 0 : 1;
}

export function getAccountPayableSearchRuleSummary(
  snapshot: AccountPayableSearchSnapshot,
  key: AccountPayableSearchFilterKey,
  searchState?: AccountPayableSearchStateResponse | null,
) {
  const rule = findAccountPayableSearchRule(snapshot, key);
  if (!rule) return null;
  return getRuleLabel(rule, searchState, false);
}

export function buildAccountPayableSmartSearchColumns(
  searchState?: AccountPayableSearchStateResponse | null,
): AccountPayableSmartSearchColumn[] {
  const catalogOperator = [{ id: AccountPayableSearchOperators.IN, label: "Es alguno de" }];

  return [
    {
      id: AccountPayableSearchFields.STATUS,
      label: "Estado",
      kind: "catalog",
      description: "Filtra obligaciones pendientes, parciales, vencidas, pagadas o canceladas.",
      operators: catalogOperator,
      supportsExclude: true,
      options: searchState?.catalogs.statuses?.length ? searchState.catalogs.statuses : ACCOUNT_PAYABLE_STATUS_OPTIONS,
    },
    {
      id: AccountPayableSearchFields.PURCHASE_ID,
      label: "Compra",
      kind: "text",
      description: "Busca una obligacion asociada a una compra.",
      operators: TEXT_OPERATOR_OPTIONS,
      placeholder: "ID de compra",
    },
    {
      id: AccountPayableSearchFields.SUPPLIER_ID,
      label: "Proveedor",
      kind: "text",
      description: "Deja preparado el filtro por proveedor para el backend avanzado.",
      operators: TEXT_OPERATOR_OPTIONS,
      placeholder: "ID de proveedor",
    },
    {
      id: AccountPayableSearchFields.CURRENCY,
      label: "Moneda",
      kind: "catalog",
      description: "Filtra obligaciones por moneda cuando el backend avanzado este disponible.",
      operators: catalogOperator,
      supportsExclude: true,
      options: searchState?.catalogs.currencies?.length ? searchState.catalogs.currencies : ACCOUNT_PAYABLE_CURRENCY_OPTIONS,
    },
    {
      id: AccountPayableSearchFields.AMOUNT_PENDING,
      label: "Saldo pendiente",
      kind: "number",
      description: "Compara el saldo pendiente de la obligacion.",
      operators: NUMBER_OPERATOR_OPTIONS,
      placeholder: "Ej. 1500",
    },
    {
      id: AccountPayableSearchFields.DUE_DATE,
      label: "Vencimiento",
      kind: "date",
      description: "Filtra por fecha de vencimiento.",
      operators: DATE_OPERATOR_OPTIONS,
      operatorInputMode: {
        [AccountPayableSearchOperators.ON]: "date",
        [AccountPayableSearchOperators.AFTER]: "date",
        [AccountPayableSearchOperators.BEFORE]: "date",
        [AccountPayableSearchOperators.BETWEEN]: "date-range",
      },
    },
  ];
}

export function buildAccountPayableListQuery(
  snapshot: AccountPayableSearchSnapshot,
): Pick<ListAccountPayablesQuery, "status" | "purchaseId"> {
  const normalized = sanitizeAccountPayableSearchSnapshot(snapshot);
  const statusRule = findAccountPayableSearchRule(normalized, AccountPayableSearchFields.STATUS);
  const purchaseRule = findAccountPayableSearchRule(normalized, AccountPayableSearchFields.PURCHASE_ID);

  const status =
    statusRule?.operator === AccountPayableSearchOperators.IN && statusRule.mode !== "exclude"
      ? statusRule.values?.[0]
      : undefined;

  const purchaseId =
    purchaseRule?.operator === AccountPayableSearchOperators.EQ
      ? purchaseRule.value
      : normalized.q;

  return {
    status: status as ListAccountPayablesQuery["status"],
    purchaseId: purchaseId?.trim() || undefined,
  };
}
