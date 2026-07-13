import type {
  DataTableSearchChip,
  DataTableSearchOption,
  SmartSearchFieldConfig,
  SmartSearchOperatorOption,
} from "@/shared/components/table/search";
import { CurrencyTypes } from "../types/purchaseEnums";
import type {
  RecurringPurchaseSearchCatalogs,
  RecurringPurchaseSearchField,
  RecurringPurchaseSearchFilters,
  RecurringPurchaseSearchOperator,
  RecurringPurchaseSearchRule,
  RecurringPurchaseSearchSnapshot,
} from "../types/recurring-purchase.types";
import {
  RecurringPurchaseSearchFields,
  RecurringPurchaseSearchOperators,
} from "../types/recurring-purchase.types";

export type RecurringPurchaseSearchFilterKey = RecurringPurchaseSearchField;
export type RecurringPurchaseSearchChip = DataTableSearchChip<RecurringPurchaseSearchFilterKey>;
export type RecurringPurchaseSmartSearchColumn = SmartSearchFieldConfig<
  RecurringPurchaseSearchFilterKey,
  RecurringPurchaseSearchOperator
>;

const FIELD_ORDER: RecurringPurchaseSearchField[] = [
  RecurringPurchaseSearchFields.NEXT_DUE_DATE,
  RecurringPurchaseSearchFields.SUPPLIER_ID,
  RecurringPurchaseSearchFields.STATUS,
  RecurringPurchaseSearchFields.FREQUENCY,
  RecurringPurchaseSearchFields.CURRENCY,
  RecurringPurchaseSearchFields.PURCHASE_TYPE,
  RecurringPurchaseSearchFields.AMOUNT,
  RecurringPurchaseSearchFields.PAYMENT_STATUS,
  RecurringPurchaseSearchFields.START_DATE,
];

const FIELD_LABELS: Record<RecurringPurchaseSearchField, string> = {
  [RecurringPurchaseSearchFields.SUPPLIER_ID]: "Proveedor",
  [RecurringPurchaseSearchFields.STATUS]: "Estado",
  [RecurringPurchaseSearchFields.FREQUENCY]: "Frecuencia",
  [RecurringPurchaseSearchFields.PURCHASE_TYPE]: "Tipo",
  [RecurringPurchaseSearchFields.CURRENCY]: "Moneda",
  [RecurringPurchaseSearchFields.START_DATE]: "Inicio",
  [RecurringPurchaseSearchFields.NEXT_DUE_DATE]: "Vencimiento",
  [RecurringPurchaseSearchFields.AMOUNT]: "Monto",
  [RecurringPurchaseSearchFields.PAYMENT_STATUS]: "Estado de pago",
};

const CATALOG_FIELDS = new Set<RecurringPurchaseSearchField>([
  RecurringPurchaseSearchFields.SUPPLIER_ID,
  RecurringPurchaseSearchFields.STATUS,
  RecurringPurchaseSearchFields.FREQUENCY,
  RecurringPurchaseSearchFields.PURCHASE_TYPE,
  RecurringPurchaseSearchFields.CURRENCY,
  RecurringPurchaseSearchFields.PAYMENT_STATUS,
]);

const NUMERIC_FIELDS = new Set<RecurringPurchaseSearchField>([
  RecurringPurchaseSearchFields.AMOUNT,
]);

const DATE_FIELDS = new Set<RecurringPurchaseSearchField>([
  RecurringPurchaseSearchFields.START_DATE,
  RecurringPurchaseSearchFields.NEXT_DUE_DATE,
]);

const NUMBER_OPERATOR_OPTIONS: SmartSearchOperatorOption<RecurringPurchaseSearchOperator>[] = [
  { id: RecurringPurchaseSearchOperators.EQ, label: "Igual a" },
  { id: RecurringPurchaseSearchOperators.GT, label: "Mayor que" },
  { id: RecurringPurchaseSearchOperators.GTE, label: "Mayor o igual" },
  { id: RecurringPurchaseSearchOperators.LT, label: "Menor que" },
  { id: RecurringPurchaseSearchOperators.LTE, label: "Menor o igual" },
];

const DATE_OPERATOR_OPTIONS: SmartSearchOperatorOption<RecurringPurchaseSearchOperator>[] = [
  { id: RecurringPurchaseSearchOperators.ON, label: "Es" },
  { id: RecurringPurchaseSearchOperators.AFTER, label: "Despues de" },
  { id: RecurringPurchaseSearchOperators.BEFORE, label: "Antes de" },
  { id: RecurringPurchaseSearchOperators.BETWEEN, label: "Entre" },
];

const STATUS_OPTIONS: DataTableSearchOption[] = [
  { id: "ACTIVE", label: "Activa" },
  { id: "PAUSED", label: "Pausada" },
  { id: "CANCELLED", label: "Cancelada" },
];

const FREQUENCY_OPTIONS: DataTableSearchOption[] = [
  { id: "MONTHLY", label: "Mensual" },
  { id: "ANNUAL", label: "Anual" },
];

const PURCHASE_TYPE_OPTIONS: DataTableSearchOption[] = [
  { id: "SERVICE", label: "Servicio" },
  { id: "SUBSCRIPTION", label: "Suscripcion" },
];

const CURRENCY_OPTIONS: DataTableSearchOption[] = [
  { id: CurrencyTypes.PEN, label: "PEN" },
  { id: CurrencyTypes.USD, label: "USD" },
];

const PAYMENT_STATUS_OPTIONS: DataTableSearchOption[] = [
  { id: "PENDING", label: "Pendiente" },
  { id: "PARTIAL", label: "Parcial" },
  { id: "PAID", label: "Pagado" },
  { id: "OVERDUE", label: "Vencido" },
];

const OPERATOR_LABELS: Record<RecurringPurchaseSearchOperator, string> = {
  [RecurringPurchaseSearchOperators.IN]: ":",
  [RecurringPurchaseSearchOperators.CONTAINS]: "contiene",
  [RecurringPurchaseSearchOperators.EQ]: "=",
  [RecurringPurchaseSearchOperators.GT]: ">",
  [RecurringPurchaseSearchOperators.GTE]: ">=",
  [RecurringPurchaseSearchOperators.LT]: "<",
  [RecurringPurchaseSearchOperators.LTE]: "<=",
  [RecurringPurchaseSearchOperators.ON]: "=",
  [RecurringPurchaseSearchOperators.BEFORE]: "<",
  [RecurringPurchaseSearchOperators.AFTER]: ">",
  [RecurringPurchaseSearchOperators.BETWEEN]: "entre",
  [RecurringPurchaseSearchOperators.ON_OR_BEFORE]: "<=",
  [RecurringPurchaseSearchOperators.ON_OR_AFTER]: ">=",
};

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
  const normalized = normalizeDateValue(value);
  if (!normalized) return value?.trim() ?? "";
  const [year, month, day] = normalized.split("-");
  return `${day}/${month}/${year}`;
}

function sanitizeRule(rule?: Partial<RecurringPurchaseSearchRule> | null): RecurringPurchaseSearchRule | null {
  if (!rule?.field || !rule.operator) return null;
  if (!Object.values(RecurringPurchaseSearchFields).includes(rule.field)) return null;
  if (!Object.values(RecurringPurchaseSearchOperators).includes(rule.operator)) return null;

  if (CATALOG_FIELDS.has(rule.field)) {
    if (rule.operator !== RecurringPurchaseSearchOperators.IN) return null;
    const values = uniqueStrings(rule.values ?? (rule.value ? [rule.value] : undefined));
    if (!values.length) return null;
    return {
      field: rule.field,
      operator: rule.operator,
      mode: rule.mode === "exclude" ? "exclude" : "include",
      values,
    };
  }

  if (NUMERIC_FIELDS.has(rule.field)) {
    const value = rule.value?.trim();
    if (!value || Number.isNaN(Number(value))) return null;
    return { field: rule.field, operator: rule.operator, value };
  }

  if (DATE_FIELDS.has(rule.field)) {
    if (rule.operator === RecurringPurchaseSearchOperators.BETWEEN) {
      const start = normalizeDateValue(rule.range?.start);
      const end = normalizeDateValue(rule.range?.end);
      if (!start || !end) return null;
      return { field: rule.field, operator: rule.operator, range: { start, end } };
    }

    const value = normalizeDateValue(rule.value);
    if (!value) return null;
    return { field: rule.field, operator: rule.operator, value };
  }

  return null;
}

function getCatalogMap(field: RecurringPurchaseSearchField, catalogs?: RecurringPurchaseSearchCatalogs | null) {
  if (field === RecurringPurchaseSearchFields.SUPPLIER_ID) {
    return new Map((catalogs?.suppliers ?? []).map((item) => [item.id, item.label]));
  }
  if (field === RecurringPurchaseSearchFields.STATUS) return new Map((catalogs?.statuses ?? STATUS_OPTIONS).map((item) => [item.id, item.label]));
  if (field === RecurringPurchaseSearchFields.FREQUENCY) return new Map((catalogs?.frequencies ?? FREQUENCY_OPTIONS).map((item) => [item.id, item.label]));
  if (field === RecurringPurchaseSearchFields.PURCHASE_TYPE) return new Map((catalogs?.purchaseTypes ?? PURCHASE_TYPE_OPTIONS).map((item) => [item.id, item.label]));
  if (field === RecurringPurchaseSearchFields.CURRENCY) return new Map((catalogs?.currencies ?? CURRENCY_OPTIONS).map((item) => [item.id, item.label]));
  if (field === RecurringPurchaseSearchFields.PAYMENT_STATUS) return new Map((catalogs?.paymentStatuses ?? PAYMENT_STATUS_OPTIONS).map((item) => [item.id, item.label]));
  return new Map<string, string>();
}

function getRuleLabel(
  rule: RecurringPurchaseSearchRule,
  catalogs?: RecurringPurchaseSearchCatalogs | null,
  includeFieldLabel = true,
) {
  const fieldLabel = FIELD_LABELS[rule.field];

  if (rule.operator === RecurringPurchaseSearchOperators.IN) {
    const map = getCatalogMap(rule.field, catalogs);
    const content = (rule.values ?? []).map((value) => map.get(value) ?? value).join(" - ");
    const prefix = rule.mode === "exclude"
      ? includeFieldLabel ? `${fieldLabel} excluye: ` : "Excluye: "
      : includeFieldLabel ? `${fieldLabel}: ` : "";
    return `${prefix}${content}`;
  }

  if (rule.operator === RecurringPurchaseSearchOperators.BETWEEN) {
    if (!rule.range?.start || !rule.range?.end) return includeFieldLabel ? fieldLabel : "";
    const content = `${formatRuleValueLabel(rule.range.start)} y ${formatRuleValueLabel(rule.range.end)}`;
    return includeFieldLabel ? `${fieldLabel} ${OPERATOR_LABELS[rule.operator]} ${content}` : `${OPERATOR_LABELS[rule.operator]} ${content}`;
  }

  if (!rule.value) return includeFieldLabel ? fieldLabel : "";
  const content = `${OPERATOR_LABELS[rule.operator]} ${formatRuleValueLabel(rule.value)}`;
  return includeFieldLabel ? `${fieldLabel} ${content}` : content;
}

export function createEmptyRecurringPurchaseSearchFilters(): RecurringPurchaseSearchFilters {
  return [];
}

export function sanitizeRecurringPurchaseSearchSnapshot(
  snapshot?: Partial<RecurringPurchaseSearchSnapshot> | null,
): RecurringPurchaseSearchSnapshot {
  const q = snapshot?.q?.trim();
  const rawFilters = Array.isArray(snapshot?.filters) ? snapshot.filters : [];
  const mergedByField = new Map<RecurringPurchaseSearchField, RecurringPurchaseSearchRule>();

  rawFilters.forEach((rule) => {
    const normalized = sanitizeRule(rule);
    if (!normalized) return;

    const existing = mergedByField.get(normalized.field);
    if (
      normalized.operator === RecurringPurchaseSearchOperators.IN &&
      existing?.operator === RecurringPurchaseSearchOperators.IN
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
    filters: FIELD_ORDER.map((field) => mergedByField.get(field)).filter(Boolean) as RecurringPurchaseSearchRule[],
  };
}

export function hasRecurringPurchaseSearchCriteria(snapshot: RecurringPurchaseSearchSnapshot) {
  return Boolean(snapshot.q || snapshot.filters.length);
}

export function findRecurringPurchaseSearchRule(
  snapshot: RecurringPurchaseSearchSnapshot,
  key: RecurringPurchaseSearchFilterKey,
) {
  return sanitizeRecurringPurchaseSearchSnapshot(snapshot).filters.find((rule) => rule.field === key) ?? null;
}

export function upsertRecurringPurchaseSearchRule(
  snapshot: RecurringPurchaseSearchSnapshot,
  rule: RecurringPurchaseSearchRule,
) {
  const normalized = sanitizeRecurringPurchaseSearchSnapshot(snapshot);
  return sanitizeRecurringPurchaseSearchSnapshot({
    ...normalized,
    filters: [
      ...normalized.filters.filter((item) => item.field !== rule.field),
      rule,
    ],
  });
}

export function removeRecurringPurchaseSearchKey(
  snapshot: RecurringPurchaseSearchSnapshot,
  key: "q" | RecurringPurchaseSearchFilterKey,
) {
  const normalized = sanitizeRecurringPurchaseSearchSnapshot(snapshot);
  if (key === "q") return sanitizeRecurringPurchaseSearchSnapshot({ ...normalized, q: undefined });
  return sanitizeRecurringPurchaseSearchSnapshot({
    ...normalized,
    filters: normalized.filters.filter((rule) => rule.field !== key),
  });
}

export function buildRecurringPurchaseSearchChips(
  snapshot: RecurringPurchaseSearchSnapshot,
  catalogs?: RecurringPurchaseSearchCatalogs | null,
): RecurringPurchaseSearchChip[] {
  const normalized = sanitizeRecurringPurchaseSearchSnapshot(snapshot);
  const chips: RecurringPurchaseSearchChip[] = [];

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

export function getRecurringPurchaseSearchSelectionCount(
  snapshot: RecurringPurchaseSearchSnapshot,
  key: RecurringPurchaseSearchFilterKey,
) {
  const rule = findRecurringPurchaseSearchRule(snapshot, key);
  if (!rule) return 0;
  return rule.operator === RecurringPurchaseSearchOperators.IN ? rule.values?.length ?? 0 : 1;
}

export function getRecurringPurchaseSearchRuleSummary(
  snapshot: RecurringPurchaseSearchSnapshot,
  key: RecurringPurchaseSearchFilterKey,
  catalogs?: RecurringPurchaseSearchCatalogs | null,
) {
  const rule = findRecurringPurchaseSearchRule(snapshot, key);
  if (!rule) return null;
  return getRuleLabel(rule, catalogs, false);
}

export function buildRecurringPurchaseSmartSearchColumns(
  catalogs?: RecurringPurchaseSearchCatalogs | null,
): RecurringPurchaseSmartSearchColumn[] {
  return [
    {
      id: RecurringPurchaseSearchFields.NEXT_DUE_DATE,
      label: "Vencimiento",
      kind: "date",
      description: "Filtra por fecha de proximo vencimiento.",
      operators: DATE_OPERATOR_OPTIONS,
      operatorInputMode: {
        [RecurringPurchaseSearchOperators.ON]: "date",
        [RecurringPurchaseSearchOperators.AFTER]: "date",
        [RecurringPurchaseSearchOperators.BEFORE]: "date",
        [RecurringPurchaseSearchOperators.BETWEEN]: "date-range",
      },
    },
    {
      id: RecurringPurchaseSearchFields.SUPPLIER_ID,
      label: "Proveedor",
      kind: "catalog",
      description: "Selecciona uno o varios proveedores.",
      operators: [{ id: RecurringPurchaseSearchOperators.IN, label: "Es alguno de" }],
      supportsExclude: true,
      options: catalogs?.suppliers ?? [],
    },
    {
      id: RecurringPurchaseSearchFields.STATUS,
      label: "Estado",
      kind: "catalog",
      description: "Selecciona estados para incluir o excluir.",
      operators: [{ id: RecurringPurchaseSearchOperators.IN, label: "Es alguno de" }],
      supportsExclude: true,
      options: catalogs?.statuses ?? STATUS_OPTIONS,
    },
    {
      id: RecurringPurchaseSearchFields.FREQUENCY,
      label: "Frecuencia",
      kind: "catalog",
      description: "Filtra compras mensuales o anuales.",
      operators: [{ id: RecurringPurchaseSearchOperators.IN, label: "Es alguno de" }],
      supportsExclude: true,
      options: catalogs?.frequencies ?? FREQUENCY_OPTIONS,
    },
    {
      id: RecurringPurchaseSearchFields.CURRENCY,
      label: "Moneda",
      kind: "catalog",
      description: "Filtra por moneda.",
      operators: [{ id: RecurringPurchaseSearchOperators.IN, label: "Es alguno de" }],
      supportsExclude: true,
      options: catalogs?.currencies ?? CURRENCY_OPTIONS,
    },
    {
      id: RecurringPurchaseSearchFields.PURCHASE_TYPE,
      label: "Tipo",
      kind: "catalog",
      description: "Filtra servicios o suscripciones.",
      operators: [{ id: RecurringPurchaseSearchOperators.IN, label: "Es alguno de" }],
      supportsExclude: true,
      options: catalogs?.purchaseTypes ?? PURCHASE_TYPE_OPTIONS,
    },
    {
      id: RecurringPurchaseSearchFields.AMOUNT,
      label: "Monto",
      kind: "number",
      description: "Compara el monto recurrente.",
      operators: NUMBER_OPERATOR_OPTIONS,
      placeholder: "Ej. 120",
    },
    {
      id: RecurringPurchaseSearchFields.PAYMENT_STATUS,
      label: "Estado de pago",
      kind: "catalog",
      description: "Filtra por estado de la cuenta por pagar generada.",
      operators: [{ id: RecurringPurchaseSearchOperators.IN, label: "Es alguno de" }],
      supportsExclude: true,
      options: catalogs?.paymentStatuses ?? PAYMENT_STATUS_OPTIONS,
    },
    {
      id: RecurringPurchaseSearchFields.START_DATE,
      label: "Inicio",
      kind: "date",
      description: "Filtra por fecha de compra o inicio.",
      operators: DATE_OPERATOR_OPTIONS,
      operatorInputMode: {
        [RecurringPurchaseSearchOperators.ON]: "date",
        [RecurringPurchaseSearchOperators.AFTER]: "date",
        [RecurringPurchaseSearchOperators.BEFORE]: "date",
        [RecurringPurchaseSearchOperators.BETWEEN]: "date-range",
      },
    },
  ];
}
