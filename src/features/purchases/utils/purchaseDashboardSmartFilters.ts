import type { DataTableSearchChip } from "@/shared/components/table/search";
import type {
  PurchaseDashboardFilterField,
  PurchaseDashboardFilters,
  PurchaseDashboardSavedFilterCatalogs,
  PurchaseDashboardSavedFilterRule,
  PurchaseDashboardSavedFilterSnapshot,
} from "../types/purchase-dashboard.types";

const FIELD_ORDER: PurchaseDashboardFilterField[] = [
  "purchaseType",
  "paymentStatus",
  "supplierId",
  "userId",
  "warehouseId",
  "paymentMethodId",
  "companyPaymentAccountId",
];

const FIELD_LABELS: Record<PurchaseDashboardFilterField, string> = {
  purchaseType: "Tipo de compra",
  paymentStatus: "Estado de pago",
  supplierId: "Proveedor",
  userId: "Usuario",
  warehouseId: "Almacen",
  paymentMethodId: "Metodo de pago",
  companyPaymentAccountId: "Cuenta o tarjeta",
};

const CATALOG_KEYS: Record<PurchaseDashboardFilterField, keyof PurchaseDashboardSavedFilterCatalogs> = {
  purchaseType: "purchaseTypes",
  paymentStatus: "paymentStatuses",
  supplierId: "suppliers",
  userId: "users",
  warehouseId: "warehouses",
  paymentMethodId: "paymentMethods",
  companyPaymentAccountId: "companyPaymentAccounts",
};

const FILTER_ARRAY_KEYS = {
  purchaseType: "purchaseTypes",
  paymentStatus: "paymentStatuses",
  supplierId: "supplierIds",
  userId: "userIds",
  warehouseId: "warehouseIds",
  paymentMethodId: "paymentMethodIds",
  companyPaymentAccountId: "companyPaymentAccountIds",
} satisfies Record<PurchaseDashboardFilterField, keyof PurchaseDashboardFilters>;

export type PurchaseDashboardSearchChip = DataTableSearchChip<PurchaseDashboardFilterField | "dateRange">;

function uniqueStrings(values: string[] | undefined) {
  return Array.from(new Set((values ?? []).map((value) => value?.trim()).filter(Boolean))) as string[];
}

function isDashboardFilterField(value: unknown): value is PurchaseDashboardFilterField {
  return typeof value === "string" && FIELD_ORDER.includes(value as PurchaseDashboardFilterField);
}

function normalizeDateValue(value?: string | null) {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString().slice(0, 10);
}

function formatDateLabel(value?: string) {
  const normalized = normalizeDateValue(value);
  if (!normalized) return "";
  const [year, month, day] = normalized.split("-");
  return `${day}/${month}/${year}`;
}

function sanitizeRule(rule?: Partial<PurchaseDashboardSavedFilterRule> | null) {
  if (!isDashboardFilterField(rule?.field)) return null;
  if (rule.operator !== "in") return null;

  const values = uniqueStrings(rule.values ?? (rule.value ? [rule.value] : undefined));
  if (!values.length) return null;

  return {
    field: rule.field,
    operator: "in",
    mode: "include",
    values,
  } satisfies PurchaseDashboardSavedFilterRule;
}

function sanitizeDateRange(value?: Partial<PurchaseDashboardSavedFilterSnapshot["dateRange"]> | null) {
  if (!value || value.mode !== "absolute") return undefined;

  const from = normalizeDateValue(value.from);
  const to = normalizeDateValue(value.to);

  if (!from && !to) return undefined;
  return {
    mode: "absolute",
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
  } satisfies NonNullable<PurchaseDashboardSavedFilterSnapshot["dateRange"]>;
}

function getRuleValue(filters: PurchaseDashboardFilters, field: PurchaseDashboardFilterField) {
  const value = filters[field]?.trim();
  return value || undefined;
}

function getRuleValues(filters: PurchaseDashboardFilters, field: PurchaseDashboardFilterField) {
  const arrayKey = FILTER_ARRAY_KEYS[field];
  const values = Array.isArray(filters[arrayKey]) ? filters[arrayKey] as string[] : [];
  return uniqueStrings([...(getRuleValue(filters, field) ? [getRuleValue(filters, field) as string] : []), ...values]);
}

function getCatalogLabel(
  field: PurchaseDashboardFilterField,
  value: string,
  catalogs?: PurchaseDashboardSavedFilterCatalogs | null,
) {
  const options = catalogs?.[CATALOG_KEYS[field]] ?? [];
  return options.find((option) => option.id === value)?.label ?? value;
}

export function sanitizePurchaseDashboardFilterSnapshot(
  snapshot?: Partial<PurchaseDashboardSavedFilterSnapshot> | null,
): PurchaseDashboardSavedFilterSnapshot {
  const rawFilters = Array.isArray(snapshot?.filters) ? snapshot.filters : [];
  const mergedByField = new Map<PurchaseDashboardFilterField, PurchaseDashboardSavedFilterRule>();

  rawFilters.forEach((rule) => {
    const normalized = sanitizeRule(rule as PurchaseDashboardSavedFilterRule);
    if (!normalized) return;

    const existing = mergedByField.get(normalized.field);
    mergedByField.set(normalized.field, {
      field: normalized.field,
      operator: "in",
      mode: "include",
      values: uniqueStrings([...(existing?.values ?? []), ...(normalized.values ?? [])]),
    });
  });

  const dateRange = sanitizeDateRange(snapshot?.dateRange);

  return {
    filters: FIELD_ORDER.map((field) => mergedByField.get(field)).filter(Boolean) as PurchaseDashboardSavedFilterRule[],
    ...(dateRange ? { dateRange } : {}),
  };
}

export function dashboardFiltersToSnapshot(
  filters: PurchaseDashboardFilters,
): PurchaseDashboardSavedFilterSnapshot {
  const rules = FIELD_ORDER.flatMap((field) => {
    const values = getRuleValues(filters, field);
    if (!values.length) return [];
    return [{
      field,
      operator: "in",
      mode: "include",
      values,
    } satisfies PurchaseDashboardSavedFilterRule];
  });

  return sanitizePurchaseDashboardFilterSnapshot({
    filters: rules,
    dateRange: {
      mode: "absolute",
      from: filters.from,
      to: filters.to,
    },
  });
}

export function snapshotToDashboardFilters(
  snapshot?: Partial<PurchaseDashboardSavedFilterSnapshot> | null,
): PurchaseDashboardFilters {
  const normalized = sanitizePurchaseDashboardFilterSnapshot(snapshot);
  const filters: PurchaseDashboardFilters = {};

  if (normalized.dateRange?.from) filters.from = normalized.dateRange.from;
  if (normalized.dateRange?.to) filters.to = normalized.dateRange.to;

  normalized.filters.forEach((rule) => {
    const values = uniqueStrings(rule.values);
    if (!values.length) return;
    const arrayKey = FILTER_ARRAY_KEYS[rule.field];
    (filters[arrayKey] as string[] | undefined) = values;
  });

  return filters;
}

export function hasPurchaseDashboardFilterCriteria(
  snapshot?: Partial<PurchaseDashboardSavedFilterSnapshot> | null,
) {
  const normalized = sanitizePurchaseDashboardFilterSnapshot(snapshot);
  return Boolean(
    normalized.filters.length ||
    normalized.dateRange?.from ||
    normalized.dateRange?.to,
  );
}

export function buildPurchaseDashboardFilterLabel(
  snapshot?: Partial<PurchaseDashboardSavedFilterSnapshot> | null,
  catalogs?: PurchaseDashboardSavedFilterCatalogs | null,
) {
  const normalized = sanitizePurchaseDashboardFilterSnapshot(snapshot);
  const parts: string[] = [];

  if (normalized.dateRange?.from || normalized.dateRange?.to) {
    const from = formatDateLabel(normalized.dateRange.from);
    const to = formatDateLabel(normalized.dateRange.to);
    parts.push(`Fecha: ${from || "Inicio"} - ${to || "Fin"}`);
  }

  normalized.filters.forEach((rule) => {
    const values = rule.values?.map((value) => getCatalogLabel(rule.field, value, catalogs)) ?? [];
    if (!values.length) return;
    parts.push(`${FIELD_LABELS[rule.field]}: ${values.join(" - ")}`);
  });

  return parts.join(" | ") || "Filtro guardado";
}

export function buildPurchaseDashboardSearchChips(
  snapshot?: Partial<PurchaseDashboardSavedFilterSnapshot> | null,
  catalogs?: PurchaseDashboardSavedFilterCatalogs | null,
): PurchaseDashboardSearchChip[] {
  const normalized = sanitizePurchaseDashboardFilterSnapshot(snapshot);
  const chips: PurchaseDashboardSearchChip[] = [];

  if (normalized.dateRange?.from || normalized.dateRange?.to) {
    const from = formatDateLabel(normalized.dateRange.from);
    const to = formatDateLabel(normalized.dateRange.to);
    chips.push({
      id: "dateRange",
      label: `Fecha: ${from || "Inicio"} - ${to || "Fin"}`,
      removeKey: "dateRange",
    });
  }

  normalized.filters.forEach((rule) => {
    const values = rule.values?.map((value) => getCatalogLabel(rule.field, value, catalogs)) ?? [];
    if (!values.length) return;
    chips.push({
      id: rule.field,
      label: `${FIELD_LABELS[rule.field]}: ${values.join(" - ")}`,
      removeKey: rule.field,
    });
  });

  return chips;
}
