import type {
  DataTableSearchChip,
  DataTableSearchOption,
  SmartSearchFieldConfig,
  SmartSearchOperatorOption,
} from "@/shared/components/table/search";
import type {
  SaleOrderSearchField,
  SaleOrderSearchRule,
  SaleOrderSearchSnapshot,
  SaleOrderSearchStateResponse,
} from "@/features/sale-orders/types/saleOrder";

export const SaleOrderSearchFields = {
  NUMBER: "number",
  CLIENT_ID: "clientId",
  WAREHOUSE_ID: "warehouseId",
  AGENDA_STATUS: "agendaStatus",
  DELIVERY_STATUS: "deliveryStatus",
  DELIVERY_TYPE: "deliveryType",
  PAYMENT_STATUS: "paymentStatus",
  SCHEDULE_DATE: "scheduleDate",
  DELIVERY_DATE: "deliveryDate",
} as const;

export type SaleOrderSearchFilterKey = SaleOrderSearchField;

export const SaleOrderSearchOperators = {
  IN: "in",
  CONTAINS: "contains",
  EQ: "eq",
  ON: "on",
  BEFORE: "before",
  AFTER: "after",
  BETWEEN: "between",
  ON_OR_BEFORE: "onOrBefore",
  ON_OR_AFTER: "onOrAfter",
} as const;

export type SaleOrderSearchOperator = SaleOrderSearchRule["operator"];

export type SaleOrderSearchFilters = SaleOrderSearchRule[];

export type SaleOrderSearchChip = DataTableSearchChip<SaleOrderSearchFilterKey>;

export type SaleOrderSmartSearchColumn = SmartSearchFieldConfig<SaleOrderSearchFilterKey, SaleOrderSearchOperator>;

type SaleOrderSearchOperatorOption = SmartSearchOperatorOption<SaleOrderSearchOperator>;

const FIELD_LABELS: Record<SaleOrderSearchField, string> = {
  number: "Número",
  clientId: "Cliente",
  warehouseId: "Almacén",
  agendaStatus: "Estado agenda",
  deliveryStatus: "Estado entrega",
  deliveryType: "Tipo entrega",
  paymentStatus: "Estado de pago",
  scheduleDate: "Fecha agenda",
  deliveryDate: "Fecha entrega",
};

const CATALOG_FIELDS = new Set<SaleOrderSearchField>([
  SaleOrderSearchFields.CLIENT_ID,
  SaleOrderSearchFields.WAREHOUSE_ID,
  SaleOrderSearchFields.AGENDA_STATUS,
  SaleOrderSearchFields.DELIVERY_STATUS,
  SaleOrderSearchFields.DELIVERY_TYPE,
  SaleOrderSearchFields.PAYMENT_STATUS,
]);

const DATE_FIELDS = new Set<SaleOrderSearchField>([
  SaleOrderSearchFields.SCHEDULE_DATE,
  SaleOrderSearchFields.DELIVERY_DATE,
]);

const TEXT_FIELDS = new Set<SaleOrderSearchField>([SaleOrderSearchFields.NUMBER]);

const isValidIsoDateOnly = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

const DATE_OPERATOR_OPTIONS: SaleOrderSearchOperatorOption[] = [
  { id: SaleOrderSearchOperators.ON, label: "Es" },
  { id: SaleOrderSearchOperators.AFTER, label: "Después de" },
  { id: SaleOrderSearchOperators.BEFORE, label: "Antes de" },
  { id: SaleOrderSearchOperators.BETWEEN, label: "Entre" },
  { id: SaleOrderSearchOperators.ON_OR_AFTER, label: "Desde" },
  { id: SaleOrderSearchOperators.ON_OR_BEFORE, label: "Hasta" },
];

const OPERATOR_LABELS: Record<SaleOrderSearchOperator, string> = {
  in: ":",
  contains: "contiene",
  eq: "=",
  on: "es",
  before: "antes de",
  after: "después de",
  between: "entre",
  onOrBefore: "hasta",
  onOrAfter: "desde",
};

function uniqueStrings(values: string[] | undefined) {
  return Array.from(new Set((values ?? []).map((value) => value?.trim()).filter(Boolean))) as string[];
}

function sanitizeRule(rule?: Partial<SaleOrderSearchRule> | null): SaleOrderSearchRule | null {
  if (!rule?.field || !rule.operator) return null;

  const field = rule.field;
  const operator = rule.operator;

  if (CATALOG_FIELDS.has(field)) {
    if (operator !== SaleOrderSearchOperators.IN) return null;
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
    if (operator !== SaleOrderSearchOperators.CONTAINS && operator !== SaleOrderSearchOperators.EQ) return null;
    const value = rule.value?.trim() ?? "";
    if (!value) return null;
    return {
      field,
      operator,
      value,
    };
  }

  if (DATE_FIELDS.has(field)) {
    if (
      operator !== SaleOrderSearchOperators.ON &&
      operator !== SaleOrderSearchOperators.BEFORE &&
      operator !== SaleOrderSearchOperators.AFTER &&
      operator !== SaleOrderSearchOperators.BETWEEN &&
      operator !== SaleOrderSearchOperators.ON_OR_BEFORE &&
      operator !== SaleOrderSearchOperators.ON_OR_AFTER
    ) {
      return null;
    }

    if (operator === SaleOrderSearchOperators.BETWEEN) {
      const start = rule.range?.start?.trim() ?? "";
      const end = rule.range?.end?.trim() ?? "";
      if (!start || !end) return null;
      if (!isValidIsoDateOnly(start) || !isValidIsoDateOnly(end)) return null;
      return {
        field,
        operator,
        range: { start, end },
      };
    }

    const value = rule.value?.trim() ?? "";
    if (!value) return null;
    if (!isValidIsoDateOnly(value)) return null;
    return {
      field,
      operator,
      value,
    };
  }

  return null;
}

export function sanitizeSaleOrderSearchSnapshot(
  snapshot?: Partial<SaleOrderSearchSnapshot> | { q?: string; filters?: unknown } | null,
): SaleOrderSearchSnapshot {
  const q = snapshot?.q?.trim();
  const rawFilters = Array.isArray((snapshot as any)?.filters) ? ((snapshot as any).filters as unknown[]) : [];
  const filters = rawFilters
    .map((rule) => sanitizeRule(rule as Partial<SaleOrderSearchRule>))
    .filter(Boolean) as SaleOrderSearchFilters;

  return {
    q: q || undefined,
    filters,
  };
}

export function hasSaleOrderSearchCriteria(snapshot: SaleOrderSearchSnapshot) {
  return Boolean(snapshot.q || snapshot.filters.length);
}

export function createEmptySaleOrderSearchFilters(): SaleOrderSearchFilters {
  return [];
}

export function findSaleOrderSearchRule(snapshot: SaleOrderSearchSnapshot, key: SaleOrderSearchFilterKey) {
  const normalized = sanitizeSaleOrderSearchSnapshot(snapshot);
  return normalized.filters.find((rule) => rule.field === key) ?? null;
}

export function upsertSaleOrderSearchRule(snapshot: SaleOrderSearchSnapshot, rule: SaleOrderSearchRule) {
  const normalized = sanitizeSaleOrderSearchSnapshot(snapshot);
  const nextRule = sanitizeRule(rule);
  if (!nextRule) return normalized;
  const nextFilters = normalized.filters.filter((item) => item.field !== nextRule.field);
  return sanitizeSaleOrderSearchSnapshot({
    ...normalized,
    filters: [...nextFilters, nextRule],
  });
}

export function removeSaleOrderSearchKey(snapshot: SaleOrderSearchSnapshot, key: "q" | SaleOrderSearchFilterKey) {
  const normalized = sanitizeSaleOrderSearchSnapshot(snapshot);
  if (key === "q") return sanitizeSaleOrderSearchSnapshot({ ...normalized, q: undefined });
  return sanitizeSaleOrderSearchSnapshot({
    ...normalized,
    filters: normalized.filters.filter((rule) => rule.field !== key),
  });
}

function getPaymentStatusLabel(values: string[], searchState?: SaleOrderSearchStateResponse | null) {
  const map = new Map((searchState?.catalogs.paymentStatuses ?? []).map((item) => [item.id, item.label]));
  const labels = values.map((id) => map.get(id) ?? id).filter(Boolean);
  return labels.join(", ");
}

function getCatalogLabel(values: string[], options: DataTableSearchOption[] | undefined) {
  const map = new Map((options ?? []).map((item) => [item.id, item.label]));
  const labels = values.map((id) => map.get(id) ?? id).filter(Boolean);
  return labels.join(", ");
}

function getRuleLabel(rule: SaleOrderSearchRule, searchState?: SaleOrderSearchStateResponse | null) {
  const fieldLabel = FIELD_LABELS[rule.field];

  if (CATALOG_FIELDS.has(rule.field) && rule.operator === SaleOrderSearchOperators.IN) {
    const values = rule.values ?? [];
    const label =
      rule.field === SaleOrderSearchFields.PAYMENT_STATUS
        ? getPaymentStatusLabel(values, searchState)
        : rule.field === SaleOrderSearchFields.CLIENT_ID
          ? getCatalogLabel(values, searchState?.catalogs.clients)
          : rule.field === SaleOrderSearchFields.WAREHOUSE_ID
            ? getCatalogLabel(values, searchState?.catalogs.warehouses)
            : rule.field === SaleOrderSearchFields.AGENDA_STATUS
              ? getCatalogLabel(values, searchState?.catalogs.agendaStatuses)
              : rule.field === SaleOrderSearchFields.DELIVERY_STATUS
                ? getCatalogLabel(values, searchState?.catalogs.deliveryStatuses)
                : rule.field === SaleOrderSearchFields.DELIVERY_TYPE
                  ? getCatalogLabel(values, searchState?.catalogs.deliveryTypes)
                  : getCatalogLabel(values, undefined);
    if (!label) return null;
    const modePrefix = rule.mode === "exclude" ? "No" : "";
    return `${fieldLabel}: ${modePrefix ? `${modePrefix} ` : ""}${label}`.trim();
  }

  if (TEXT_FIELDS.has(rule.field)) {
    if (rule.operator !== SaleOrderSearchOperators.CONTAINS && rule.operator !== SaleOrderSearchOperators.EQ) return null;
    if (!rule.value) return null;
    const opLabel = OPERATOR_LABELS[rule.operator];
    return `${fieldLabel} ${opLabel} ${rule.value}`;
  }

  if (DATE_FIELDS.has(rule.field)) {
    const opLabel = OPERATOR_LABELS[rule.operator];
    if (rule.operator === SaleOrderSearchOperators.BETWEEN) {
      const start = rule.range?.start;
      const end = rule.range?.end;
      if (!start || !end) return null;
      return `${fieldLabel} ${opLabel} ${start} - ${end}`;
    }
    if (!rule.value) return null;
    return `${fieldLabel} ${opLabel} ${rule.value}`;
  }

  return null;
}

export function buildSaleOrderSearchChips(
  snapshot: SaleOrderSearchSnapshot,
  searchState?: SaleOrderSearchStateResponse | null,
): SaleOrderSearchChip[] {
  const normalized = sanitizeSaleOrderSearchSnapshot(snapshot);
  const chips: SaleOrderSearchChip[] = [];

  if (normalized.q) {
    chips.push({
      id: "q",
      label: `Búsqueda: ${normalized.q}`,
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

export function getSaleOrderSearchSelectionCount(snapshot: SaleOrderSearchSnapshot, key: SaleOrderSearchFilterKey) {
  const rule = findSaleOrderSearchRule(snapshot, key);
  if (!rule) return 0;
  if (rule.operator === SaleOrderSearchOperators.IN) return rule.values?.length ?? 0;
  return 1;
}

export function getSaleOrderSearchRuleSummary(
  snapshot: SaleOrderSearchSnapshot,
  key: SaleOrderSearchFilterKey,
  searchState?: SaleOrderSearchStateResponse | null,
) {
  const rule = findSaleOrderSearchRule(snapshot, key);
  if (!rule) return null;
  return getRuleLabel(rule, searchState);
}

export function buildSaleOrderSmartSearchColumns(
  searchState?: SaleOrderSearchStateResponse | null,
): SaleOrderSmartSearchColumn[] {
  const paymentStatusOptions: DataTableSearchOption[] = (searchState?.catalogs.paymentStatuses ?? []) as DataTableSearchOption[];
  const clientOptions: DataTableSearchOption[] = (searchState?.catalogs.clients ?? []) as DataTableSearchOption[];
  const warehouseOptions: DataTableSearchOption[] = (searchState?.catalogs.warehouses ?? []) as DataTableSearchOption[];
  const agendaStatusOptions: DataTableSearchOption[] = (searchState?.catalogs.agendaStatuses ?? []) as DataTableSearchOption[];
  const deliveryStatusOptions: DataTableSearchOption[] = (searchState?.catalogs.deliveryStatuses ?? []) as DataTableSearchOption[];
  const deliveryTypeOptions: DataTableSearchOption[] = (searchState?.catalogs.deliveryTypes ?? []) as DataTableSearchOption[];

  return [
    {
      id: SaleOrderSearchFields.NUMBER,
      label: "Número",
      kind: "text",
      description: 'Busca por serie/correlativo (ej. "S01-123").',
      operators: [
        { id: SaleOrderSearchOperators.CONTAINS, label: "Contiene" },
        { id: SaleOrderSearchOperators.EQ, label: "Es igual a" },
      ],
      placeholder: "Ej. S01-123",
    },
    {
      id: SaleOrderSearchFields.CLIENT_ID,
      label: "Cliente",
      kind: "catalog",
      description: "Filtra por cliente.",
      operators: [{ id: SaleOrderSearchOperators.IN, label: "Es alguno de" }],
      supportsExclude: true,
      options: clientOptions,
    },
    {
      id: SaleOrderSearchFields.WAREHOUSE_ID,
      label: "Almacén",
      kind: "catalog",
      description: "Filtra por almacén.",
      operators: [{ id: SaleOrderSearchOperators.IN, label: "Es alguno de" }],
      supportsExclude: true,
      options: warehouseOptions,
    },
    {
      id: SaleOrderSearchFields.AGENDA_STATUS,
      label: "Estado agenda",
      kind: "catalog",
      description: "Filtra por estado de agenda.",
      operators: [{ id: SaleOrderSearchOperators.IN, label: "Es alguno de" }],
      supportsExclude: true,
      options: agendaStatusOptions,
    },
    {
      id: SaleOrderSearchFields.DELIVERY_STATUS,
      label: "Estado entrega",
      kind: "catalog",
      description: "Filtra por estado de entrega.",
      operators: [{ id: SaleOrderSearchOperators.IN, label: "Es alguno de" }],
      supportsExclude: true,
      options: deliveryStatusOptions,
    },
    {
      id: SaleOrderSearchFields.DELIVERY_TYPE,
      label: "Tipo entrega",
      kind: "catalog",
      description: "Filtra por tipo de entrega.",
      operators: [{ id: SaleOrderSearchOperators.IN, label: "Es alguno de" }],
      supportsExclude: true,
      options: deliveryTypeOptions,
    },
    {
      id: SaleOrderSearchFields.PAYMENT_STATUS,
      label: "Estado de pago",
      kind: "catalog",
      description: "Filtra por estado de pago (Pagado/Pendiente).",
      operators: [{ id: SaleOrderSearchOperators.IN, label: "Es alguno de" }],
      supportsExclude: true,
      options: paymentStatusOptions,
    },
    {
      id: SaleOrderSearchFields.SCHEDULE_DATE,
      label: "Fecha agenda",
      kind: "date",
      description: "Filtra por fecha de agenda.",
      operators: DATE_OPERATOR_OPTIONS,
      operatorInputMode: {
        [SaleOrderSearchOperators.BETWEEN]: "date-range",
      },
    },
    {
      id: SaleOrderSearchFields.DELIVERY_DATE,
      label: "Fecha entrega",
      kind: "date",
      description: "Filtra por fecha de entrega.",
      operators: DATE_OPERATOR_OPTIONS,
      operatorInputMode: {
        [SaleOrderSearchOperators.BETWEEN]: "date-range",
      },
    },
  ];
}
