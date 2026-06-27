import type {
  DataTableSearchChip,
  DataTableSearchOption,
  SmartSearchFieldConfig,
  SmartSearchOperatorOption,
} from "@/shared/components/table/search";
import type {
  PurchaseSearchField,
  PurchaseSearchFilters,
  PurchaseSearchOperator,
  PurchaseSearchRule,
  PurchaseSearchSnapshot,
  PurchaseSearchStateResponse,
} from "../types/purchase";
import {
  PurchaseSearchFields as BasePurchaseSearchFields,
  PurchaseSearchOperators,
} from "../types/purchase";
import { purchaseEventFilterOptions } from "./purchase-event-labels";

export type PurchaseHistorySearchFilterKey = PurchaseSearchField;
export type PurchaseHistorySearchChip = DataTableSearchChip<PurchaseHistorySearchFilterKey>;
export type PurchaseHistorySmartSearchColumn = SmartSearchFieldConfig<
  PurchaseHistorySearchFilterKey,
  PurchaseSearchOperator
>;

type OperatorOption = SmartSearchOperatorOption<PurchaseSearchOperator>;

const PurchaseHistorySearchFields = {
  NUMBER: BasePurchaseSearchFields.NUMBER,
  SUPPLIER_ID: BasePurchaseSearchFields.SUPPLIER_ID,
  STATUS: BasePurchaseSearchFields.STATUS,
  EVENT_TYPE: "eventType" as PurchaseSearchField,
  PERFORMED_BY_USER_ID: "performedByUserId" as PurchaseSearchField,
  LAST_EVENT_AT: "lastEventAt" as PurchaseSearchField,
  EVENTS_COUNT: "eventsCount" as PurchaseSearchField,
} as const;

const FIELD_ORDER: PurchaseSearchField[] = [
  PurchaseHistorySearchFields.NUMBER,
  PurchaseHistorySearchFields.SUPPLIER_ID,
  PurchaseHistorySearchFields.STATUS,
  PurchaseHistorySearchFields.EVENT_TYPE,
  PurchaseHistorySearchFields.PERFORMED_BY_USER_ID,
  PurchaseHistorySearchFields.LAST_EVENT_AT,
  PurchaseHistorySearchFields.EVENTS_COUNT,
];

const FIELD_LABELS: Partial<Record<PurchaseSearchField, string>> = {
  [PurchaseHistorySearchFields.NUMBER]: "Compra",
  [PurchaseHistorySearchFields.SUPPLIER_ID]: "Proveedor",
  [PurchaseHistorySearchFields.STATUS]: "Estado",
  [PurchaseHistorySearchFields.EVENT_TYPE]: "Evento",
  [PurchaseHistorySearchFields.PERFORMED_BY_USER_ID]: "Usuario",
  [PurchaseHistorySearchFields.LAST_EVENT_AT]: "Ultimo evento",
  [PurchaseHistorySearchFields.EVENTS_COUNT]: "Eventos",
};

const TEXT_FIELDS = new Set<PurchaseSearchField>([PurchaseHistorySearchFields.NUMBER]);
const CATALOG_FIELDS = new Set<PurchaseSearchField>([
  PurchaseHistorySearchFields.SUPPLIER_ID,
  PurchaseHistorySearchFields.STATUS,
  PurchaseHistorySearchFields.EVENT_TYPE,
  PurchaseHistorySearchFields.PERFORMED_BY_USER_ID,
]);
const DATE_FIELDS = new Set<PurchaseSearchField>([PurchaseHistorySearchFields.LAST_EVENT_AT]);
const NUMERIC_FIELDS = new Set<PurchaseSearchField>([PurchaseHistorySearchFields.EVENTS_COUNT]);

const TEXT_OPERATOR_OPTIONS: OperatorOption[] = [
  { id: PurchaseSearchOperators.CONTAINS, label: "Contiene" },
  { id: PurchaseSearchOperators.EQ, label: "Es igual a" },
];

const NUMBER_OPERATOR_OPTIONS: OperatorOption[] = [
  { id: PurchaseSearchOperators.EQ, label: "Igual a" },
  { id: PurchaseSearchOperators.GT, label: "Mayor que" },
  { id: PurchaseSearchOperators.GTE, label: "Mayor o igual" },
  { id: PurchaseSearchOperators.LT, label: "Menor que" },
  { id: PurchaseSearchOperators.LTE, label: "Menor o igual" },
];

const DATE_OPERATOR_OPTIONS: OperatorOption[] = [
  { id: PurchaseSearchOperators.ON, label: "Es" },
  { id: PurchaseSearchOperators.AFTER, label: "Despues de" },
  { id: PurchaseSearchOperators.BEFORE, label: "Antes de" },
  { id: PurchaseSearchOperators.BETWEEN, label: "Entre" },
];

const OPERATOR_LABELS: Partial<Record<PurchaseSearchOperator, string>> = {
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
};

const TEXT_OPERATORS: PurchaseSearchOperator[] = [
  PurchaseSearchOperators.CONTAINS,
  PurchaseSearchOperators.EQ,
];

const NUMERIC_OPERATORS: PurchaseSearchOperator[] = [
  PurchaseSearchOperators.EQ,
  PurchaseSearchOperators.GT,
  PurchaseSearchOperators.GTE,
  PurchaseSearchOperators.LT,
  PurchaseSearchOperators.LTE,
];

const DATE_OPERATORS: PurchaseSearchOperator[] = [
  PurchaseSearchOperators.ON,
  PurchaseSearchOperators.AFTER,
  PurchaseSearchOperators.BEFORE,
  PurchaseSearchOperators.BETWEEN,
];

const uniqueStrings = (values: string[] | undefined) =>
  Array.from(new Set((values ?? []).map((value) => value?.trim()).filter(Boolean))) as string[];

function normalizeDateValue(value?: string | null) {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString().slice(0, 10);
}

function sanitizeRule(rule?: Partial<PurchaseSearchRule> | null): PurchaseSearchRule | null {
  if (!rule?.field || !rule.operator) return null;
  const field = rule.field;
  const operator = rule.operator;

  if (!FIELD_ORDER.includes(field)) return null;
  if (!Object.values(PurchaseSearchOperators).includes(operator)) return null;

  if (CATALOG_FIELDS.has(field)) {
    if (operator !== PurchaseSearchOperators.IN) return null;
    const values = uniqueStrings(rule.values ?? (rule.value ? [rule.value] : undefined));
    if (!values.length) return null;
    return { field, operator, mode: rule.mode === "exclude" ? "exclude" : "include", values };
  }

  if (TEXT_FIELDS.has(field)) {
    if (!TEXT_OPERATORS.includes(operator)) return null;
    const value = rule.value?.trim();
    return value ? { field, operator, value } : null;
  }

  if (NUMERIC_FIELDS.has(field)) {
    if (!NUMERIC_OPERATORS.includes(operator)) return null;
    const value = rule.value?.trim();
    return value && !Number.isNaN(Number(value)) ? { field, operator, value } : null;
  }

  if (DATE_FIELDS.has(field)) {
    if (!DATE_OPERATORS.includes(operator)) return null;
    if (operator === PurchaseSearchOperators.BETWEEN) {
      const start = normalizeDateValue(rule.range?.start);
      const end = normalizeDateValue(rule.range?.end);
      return start && end ? { field, operator, range: start <= end ? { start, end } : { start: end, end: start } } : null;
    }
    const value = normalizeDateValue(rule.value);
    return value ? { field, operator, value } : null;
  }

  return null;
}

export function createEmptyPurchaseHistorySearchFilters(): PurchaseSearchFilters {
  return [];
}

export function sanitizePurchaseHistorySearchSnapshot(
  snapshot?: Partial<PurchaseSearchSnapshot> | { q?: string; filters?: unknown } | null,
): PurchaseSearchSnapshot {
  const q = snapshot?.q?.trim();
  const rawFilters = Array.isArray(snapshot?.filters) ? snapshot.filters : [];
  const mergedByField = new Map<PurchaseSearchField, PurchaseSearchRule>();

  rawFilters.forEach((rule) => {
    const normalized = sanitizeRule(rule as PurchaseSearchRule);
    if (!normalized) return;
    const existing = mergedByField.get(normalized.field);
    if (normalized.operator === PurchaseSearchOperators.IN && existing?.operator === PurchaseSearchOperators.IN) {
      mergedByField.set(normalized.field, {
        ...normalized,
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

export function hasPurchaseHistorySearchCriteria(snapshot: PurchaseSearchSnapshot) {
  const normalized = sanitizePurchaseHistorySearchSnapshot(snapshot);
  return Boolean(normalized.q || normalized.filters.length);
}

export function upsertPurchaseHistorySearchRule(snapshot: PurchaseSearchSnapshot, rule: PurchaseSearchRule) {
  const normalized = sanitizePurchaseHistorySearchSnapshot(snapshot);
  return sanitizePurchaseHistorySearchSnapshot({
    ...normalized,
    filters: [...normalized.filters.filter((item) => item.field !== rule.field), rule],
  });
}

export function removePurchaseHistorySearchKey(
  snapshot: PurchaseSearchSnapshot,
  key: "q" | PurchaseHistorySearchFilterKey,
) {
  const normalized = sanitizePurchaseHistorySearchSnapshot(snapshot);
  if (key === "q") return sanitizePurchaseHistorySearchSnapshot({ ...normalized, q: undefined });
  return sanitizePurchaseHistorySearchSnapshot({
    ...normalized,
    filters: normalized.filters.filter((rule) => rule.field !== key),
  });
}

export function findPurchaseHistorySearchRule(snapshot: PurchaseSearchSnapshot, key: PurchaseHistorySearchFilterKey) {
  return sanitizePurchaseHistorySearchSnapshot(snapshot).filters.find((rule) => rule.field === key) ?? null;
}

function optionMap(options?: DataTableSearchOption[]) {
  return new Map((options ?? []).map((item) => [item.id, item.label]));
}

function getCatalogMap(field: PurchaseSearchField, searchState?: PurchaseSearchStateResponse | null) {
  if (field === PurchaseHistorySearchFields.SUPPLIER_ID) return optionMap(searchState?.catalogs.suppliers);
  if (field === PurchaseHistorySearchFields.STATUS) return optionMap(searchState?.catalogs.statuses);
  if (field === PurchaseHistorySearchFields.EVENT_TYPE) return optionMap(searchState?.catalogs.events ?? purchaseEventFilterOptions.map((item) => ({ id: item.value, label: item.label })));
  if (field === PurchaseHistorySearchFields.PERFORMED_BY_USER_ID) return optionMap(searchState?.catalogs.users);
  return new Map<string, string>();
}

function getRuleLabel(rule: PurchaseSearchRule, searchState?: PurchaseSearchStateResponse | null, includeField = true) {
  const fieldLabel = FIELD_LABELS[rule.field] ?? rule.field;
  if (rule.operator === PurchaseSearchOperators.IN) {
    const labels = (rule.values ?? []).map((value) => getCatalogMap(rule.field, searchState).get(value) ?? value);
    const prefix = rule.mode === "exclude" ? `${fieldLabel} excluye: ` : includeField ? `${fieldLabel}: ` : "";
    return `${prefix}${labels.join(" - ")}`;
  }
  if (rule.operator === PurchaseSearchOperators.BETWEEN) {
    if (!rule.range?.start || !rule.range?.end) return includeField ? fieldLabel : "";
    const content = `${rule.range.start} y ${rule.range.end}`;
    return includeField ? `${fieldLabel} entre ${content}` : `entre ${content}`;
  }
  if (!rule.value) return includeField ? fieldLabel : "";
  const content = `${OPERATOR_LABELS[rule.operator] ?? rule.operator} ${rule.value}`;
  return includeField ? `${fieldLabel} ${content}` : content;
}

export function buildPurchaseHistorySearchChips(
  snapshot: PurchaseSearchSnapshot,
  searchState?: PurchaseSearchStateResponse | null,
): PurchaseHistorySearchChip[] {
  const normalized = sanitizePurchaseHistorySearchSnapshot(snapshot);
  const chips: PurchaseHistorySearchChip[] = [];
  if (normalized.q) chips.push({ id: "q", label: `Busqueda: ${normalized.q}`, removeKey: "q" });
  normalized.filters.forEach((rule) => {
    const label = getRuleLabel(rule, searchState);
    if (label) chips.push({ id: rule.field, label, removeKey: rule.field });
  });
  return chips;
}

export function getPurchaseHistorySearchSelectionCount(snapshot: PurchaseSearchSnapshot, key: PurchaseHistorySearchFilterKey) {
  const rule = findPurchaseHistorySearchRule(snapshot, key);
  if (!rule) return 0;
  return rule.operator === PurchaseSearchOperators.IN ? rule.values?.length ?? 0 : 1;
}

export function getPurchaseHistorySearchRuleSummary(
  snapshot: PurchaseSearchSnapshot,
  key: PurchaseHistorySearchFilterKey,
  searchState?: PurchaseSearchStateResponse | null,
) {
  const rule = findPurchaseHistorySearchRule(snapshot, key);
  return rule ? getRuleLabel(rule, searchState, false) : null;
}

export function buildPurchaseHistorySmartSearchColumns(
  searchState?: PurchaseSearchStateResponse | null,
): PurchaseHistorySmartSearchColumn[] {
  return [
    {
      id: PurchaseHistorySearchFields.NUMBER,
      label: "Compra",
      kind: "text",
      description: "Busca por serie, correlativo o codigo de compra.",
      operators: TEXT_OPERATOR_OPTIONS,
      placeholder: "Ej. F001-123",
    },
    {
      id: PurchaseHistorySearchFields.SUPPLIER_ID,
      label: "Proveedor",
      kind: "catalog",
      description: "Filtra por proveedor de la compra.",
      operators: [{ id: PurchaseSearchOperators.IN, label: "Es alguno de" }],
      supportsExclude: true,
      options: searchState?.catalogs.suppliers ?? [],
    },
    {
      id: PurchaseHistorySearchFields.STATUS,
      label: "Estado",
      kind: "catalog",
      description: "Filtra por estado actual de la compra.",
      operators: [{ id: PurchaseSearchOperators.IN, label: "Es alguno de" }],
      supportsExclude: true,
      options: searchState?.catalogs.statuses ?? [],
    },
    {
      id: PurchaseHistorySearchFields.EVENT_TYPE,
      label: "Evento",
      kind: "catalog",
      description: "Filtra por tipo de evento registrado en el historial.",
      operators: [{ id: PurchaseSearchOperators.IN, label: "Es alguno de" }],
      supportsExclude: true,
      options: searchState?.catalogs.events ?? purchaseEventFilterOptions.map((item) => ({ id: item.value, label: item.label })),
    },
    {
      id: PurchaseHistorySearchFields.PERFORMED_BY_USER_ID,
      label: "Usuario",
      kind: "catalog",
      description: "Filtra por usuario que ejecuto el evento.",
      operators: [{ id: PurchaseSearchOperators.IN, label: "Es alguno de" }],
      supportsExclude: true,
      options: searchState?.catalogs.users ?? [],
    },
    {
      id: PurchaseHistorySearchFields.LAST_EVENT_AT,
      label: "Ultimo evento",
      kind: "date",
      description: "Filtra por fecha del ultimo evento registrado.",
      operators: DATE_OPERATOR_OPTIONS,
      operatorInputMode: {
        [PurchaseSearchOperators.ON]: "date",
        [PurchaseSearchOperators.AFTER]: "date",
        [PurchaseSearchOperators.BEFORE]: "date",
        [PurchaseSearchOperators.BETWEEN]: "date-range",
      },
    },
    {
      id: PurchaseHistorySearchFields.EVENTS_COUNT,
      label: "Eventos",
      kind: "number",
      description: "Filtra por cantidad total de eventos de la compra.",
      operators: NUMBER_OPERATOR_OPTIONS,
      placeholder: "Ej. 3",
    },
  ];
}
