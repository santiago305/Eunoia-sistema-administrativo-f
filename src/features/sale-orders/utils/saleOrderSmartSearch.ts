import type {
  DataTableSearchChip,
  DataTableSearchOption,
  SmartSearchFieldConfig,
  SmartSearchOperatorOption,
} from "@/shared/components/table/search";
import { SmartSearchDatePeriodOperators } from "@/shared/components/table/search";
import {
  formatCalendarMonth,
  formatCalendarWeek,
  normalizeCalendarMonthValue,
  normalizeCalendarWeekValue,
} from "@/shared/components/components/date-picker/dateUtils";
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
  PAYMENT_STATUS: "paymentStatus",
  WORKFLOW_ID: "workflowId",
  SALE_ORDER_STATE_ID: "saleOrderStateId",
  SCHEDULE_DATE: "scheduleDate",
  DELIVERY_DATE: "deliveryDate",
  CREATED_AT: "createdAt",
  ADVERTISING_CODE: "advertisingCode",
  OBSERVATION: "observation",
  BANK_ACCOUNT_ID: "bankAccountId",
  CLIENT_TYPE: "clientType",
  CLIENT_DEPARTMENT_ID: "clientDepartmentId",
  CLIENT_PROVINCE_ID: "clientProvinceId",
  CLIENT_DISTRICT_ID: "clientDistrictId",
  CLIENT_PHONE: "clientPhone",
  AGENCY_DETAIL: "agencyDetail",
  SOURCE_ID: "sourceId",
  INVOICE_STATUS: "invoiceStatus",
  CREATED_BY: "createdBy",
  ASSIGNED_BY: "assignedBy",
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
  IN_MONTH: SmartSearchDatePeriodOperators.IN_MONTH,
  IN_WEEK: SmartSearchDatePeriodOperators.IN_WEEK,
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
  paymentStatus: "Estado de pago",
  workflowId: "Tipo",
  saleOrderStateId: "Estado",
  scheduleDate: "Fecha agenda",
  deliveryDate: "Fecha entrega",
  createdAt: "Fecha creación",
  advertisingCode: "Código publicitario",
  observation: "Observación",
  bankAccountId: "Cuenta bancaria",
  clientType: "Tipo de cliente",
  clientDepartmentId: "Departamento",
  clientProvinceId: "Provincia",
  clientDistrictId: "Distrito",
  clientPhone: "Celular",
  agencyDetail: "Agencia",
  sourceId: "Origen",
  invoiceStatus: "Comprobante",
  createdBy: "Creado por",
  assignedBy: "Asignado a",
};

const CATALOG_FIELDS = new Set<SaleOrderSearchField>([
  SaleOrderSearchFields.CLIENT_ID,
  SaleOrderSearchFields.WAREHOUSE_ID,
  SaleOrderSearchFields.PAYMENT_STATUS,
  SaleOrderSearchFields.WORKFLOW_ID,
  SaleOrderSearchFields.SALE_ORDER_STATE_ID,
  SaleOrderSearchFields.BANK_ACCOUNT_ID,
  SaleOrderSearchFields.CLIENT_TYPE,
  SaleOrderSearchFields.CLIENT_DEPARTMENT_ID,
  SaleOrderSearchFields.CLIENT_PROVINCE_ID,
  SaleOrderSearchFields.CLIENT_DISTRICT_ID,
  SaleOrderSearchFields.SOURCE_ID,
  SaleOrderSearchFields.INVOICE_STATUS,
  SaleOrderSearchFields.CREATED_BY,
  SaleOrderSearchFields.ASSIGNED_BY,
]);

const DATE_FIELDS = new Set<SaleOrderSearchField>([
  SaleOrderSearchFields.SCHEDULE_DATE,
  SaleOrderSearchFields.DELIVERY_DATE,
  SaleOrderSearchFields.CREATED_AT,
]);

const TEXT_FIELDS = new Set<SaleOrderSearchField>([
  SaleOrderSearchFields.NUMBER,
  SaleOrderSearchFields.ADVERTISING_CODE,
  SaleOrderSearchFields.OBSERVATION,
  SaleOrderSearchFields.CLIENT_PHONE,
  SaleOrderSearchFields.AGENCY_DETAIL,
]);

const isValidIsoDateOnly = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

const DATE_OPERATOR_OPTIONS: SaleOrderSearchOperatorOption[] = [
  { id: SaleOrderSearchOperators.ON, label: "Es" },
  { id: SaleOrderSearchOperators.AFTER, label: "Después de" },
  { id: SaleOrderSearchOperators.BEFORE, label: "Antes de" },
  { id: SaleOrderSearchOperators.BETWEEN, label: "Entre" },
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
  inMonth: "en el mes",
  inWeek: "en la semana",
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
      operator !== SaleOrderSearchOperators.ON_OR_AFTER &&
      operator !== SaleOrderSearchOperators.IN_MONTH &&
      operator !== SaleOrderSearchOperators.IN_WEEK
    ) {
      return null;
    }

    if (operator === SaleOrderSearchOperators.IN_MONTH) {
      const value = normalizeCalendarMonthValue(rule.value);
      return value ? { field, operator, value } : null;
    }

    if (operator === SaleOrderSearchOperators.IN_WEEK) {
      const value = normalizeCalendarWeekValue(rule.value);
      return value ? { field, operator, value } : null;
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
  const candidateFilters = snapshot?.filters;
  const rawFilters = Array.isArray(candidateFilters)
    ? candidateFilters
    : [];
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
  const map = new Map((searchState?.catalogs.paymentStatuses ?? []).map((item) => [getOptionId(item), item.label]));
  const labels = values.map((id) => map.get(id) ?? id).filter(Boolean);
  return labels.join(", ");
}

function getOptionId(
  option: NonNullable<
    SaleOrderSearchStateResponse["catalogs"][keyof SaleOrderSearchStateResponse["catalogs"]]
  >[number],
) {
  return option.id ?? option.saleOrderStateId ?? option.workflowId ?? option.value ?? "";
}

function normalizeSearchOptions(
  options: SaleOrderSearchStateResponse["catalogs"][keyof SaleOrderSearchStateResponse["catalogs"]] | undefined,
): DataTableSearchOption[] {
  return (options ?? [])
    .map((item) => ({
      ...item,
      id: getOptionId(item),
    }))
    .filter((item): item is DataTableSearchOption => Boolean(item.id));
}

function getCatalogLabel(values: string[], options: SaleOrderSearchStateResponse["catalogs"][keyof SaleOrderSearchStateResponse["catalogs"]] | undefined) {
  const map = new Map(normalizeSearchOptions(options).map((item) => [item.id, item.label]));
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
            : rule.field === SaleOrderSearchFields.WORKFLOW_ID
              ? getCatalogLabel(values, searchState?.catalogs.workflows)
              : rule.field === SaleOrderSearchFields.SALE_ORDER_STATE_ID
                ? getCatalogLabel(values, searchState?.catalogs.states)
                : rule.field === SaleOrderSearchFields.BANK_ACCOUNT_ID
                  ? getCatalogLabel(values, searchState?.catalogs.bankAccounts)
                  : rule.field === SaleOrderSearchFields.CLIENT_TYPE
                    ? getCatalogLabel(values, searchState?.catalogs.clientTypes)
                    : rule.field === SaleOrderSearchFields.CREATED_BY
                      ? getCatalogLabel(values, searchState?.catalogs.creators)
                      : rule.field === SaleOrderSearchFields.ASSIGNED_BY
                        ? getCatalogLabel(values, searchState?.catalogs.assignees)
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
    if (
      rule.operator === SaleOrderSearchOperators.IN_MONTH &&
      rule.value
    ) {
      const month = formatCalendarMonth(rule.value);
      return month ? `${fieldLabel} en ${month}` : null;
    }

    if (
      rule.operator === SaleOrderSearchOperators.IN_WEEK &&
      rule.value
    ) {
      const week = formatCalendarWeek(rule.value);
      return week ? `${fieldLabel} en la semana ${week}` : null;
    }

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
  const paymentStatusOptions = normalizeSearchOptions(searchState?.catalogs.paymentStatuses);
  const clientOptions = normalizeSearchOptions(searchState?.catalogs.clients);
  const warehouseOptions = normalizeSearchOptions(searchState?.catalogs.warehouses);
  const workflowOptions = normalizeSearchOptions(searchState?.catalogs.workflows);
  const stateOptions = normalizeSearchOptions(searchState?.catalogs.states);
  const bankAccountOptions = normalizeSearchOptions(searchState?.catalogs.bankAccounts);
  const clientTypeOptions = normalizeSearchOptions(searchState?.catalogs.clientTypes);
  const departmentOptions = normalizeSearchOptions(searchState?.catalogs.departments);
  const provinceOptions = normalizeSearchOptions(searchState?.catalogs.provinces);
  const districtOptions = normalizeSearchOptions(searchState?.catalogs.districts);
  const sourceOptions = normalizeSearchOptions(searchState?.catalogs.sources);
  const invoiceStatusOptions = normalizeSearchOptions(searchState?.catalogs.invoiceStatuses);
  const creatorOptions = normalizeSearchOptions(searchState?.catalogs.creators);
  const assigneeOptions = normalizeSearchOptions(searchState?.catalogs.assignees);

  return [
    {
      id: SaleOrderSearchFields.CREATED_AT,
      label: "Fecha creación",
      kind: "date",
      description: "Filtra por día de creación.",
      operators: DATE_OPERATOR_OPTIONS,
      operatorInputMode: {
        [SaleOrderSearchOperators.BETWEEN]: "date-range",
      },
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
    {
      id: SaleOrderSearchFields.NUMBER,
      label: "Documento",
      kind: "text",
      description: 'Busca por número de documento',
      operators: [
        { id: SaleOrderSearchOperators.CONTAINS, label: "Contiene" },
        { id: SaleOrderSearchOperators.EQ, label: "Es igual a" },
      ],
      placeholder: "Ej. S01-123",
    },
    {
      id: SaleOrderSearchFields.ADVERTISING_CODE,
      label: "Código publicitario",
      kind: "text",
      description: "Filtra por código publicitario.",
      operators: [
        { id: SaleOrderSearchOperators.CONTAINS, label: "Contiene" },
        { id: SaleOrderSearchOperators.EQ, label: "Es igual a" },
      ],
      placeholder: "Ej. META-123",
    },
    {
      id: SaleOrderSearchFields.OBSERVATION,
      label: "Observación",
      kind: "text",
      description: "Filtra por observación.",
      operators: [
        { id: SaleOrderSearchOperators.CONTAINS, label: "Contiene" },
        { id: SaleOrderSearchOperators.EQ, label: "Es igual a" },
      ],
      placeholder: "Texto de la observación",
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
      id: SaleOrderSearchFields.CLIENT_DEPARTMENT_ID,
      label: "Departamento",
      kind: "catalog",
      operators: [{ id: SaleOrderSearchOperators.IN, label: "Es alguno de" }],
      supportsExclude: true,
      options: departmentOptions,
    },
    {
      id: SaleOrderSearchFields.CLIENT_PROVINCE_ID,
      label: "Provincia",
      kind: "catalog",
      operators: [{ id: SaleOrderSearchOperators.IN, label: "Es alguna de" }],
      supportsExclude: true,
      options: provinceOptions,
    },
    {
      id: SaleOrderSearchFields.CLIENT_DISTRICT_ID,
      label: "Distrito",
      kind: "catalog",
      operators: [{ id: SaleOrderSearchOperators.IN, label: "Es alguno de" }],
      supportsExclude: true,
      options: districtOptions,
    },
    {
      id: SaleOrderSearchFields.CLIENT_PHONE,
      label: "Celular",
      kind: "text",
      operators: [
        { id: SaleOrderSearchOperators.CONTAINS, label: "Contiene" },
        { id: SaleOrderSearchOperators.EQ, label: "Es igual a" },
      ],
    },
    {
      id: SaleOrderSearchFields.AGENCY_DETAIL,
      label: "Agencia",
      kind: "text",
      operators: [
        { id: SaleOrderSearchOperators.CONTAINS, label: "Contiene" },
        { id: SaleOrderSearchOperators.EQ, label: "Es igual a" },
      ],
    },
    {
      id: SaleOrderSearchFields.SOURCE_ID,
      label: "Origen",
      kind: "catalog",
      operators: [{ id: SaleOrderSearchOperators.IN, label: "Es alguno de" }],
      supportsExclude: true,
      options: sourceOptions,
    },
    {
      id: SaleOrderSearchFields.INVOICE_STATUS,
      label: "Comprobante",
      kind: "catalog",
      operators: [{ id: SaleOrderSearchOperators.IN, label: "Es alguno de" }],
      supportsExclude: true,
      options: invoiceStatusOptions,
    },
    {
      id: SaleOrderSearchFields.CREATED_BY,
      label: "Creado por",
      kind: "catalog",
      operators: [{ id: SaleOrderSearchOperators.IN, label: "Es alguno de" }],
      supportsExclude: true,
      options: creatorOptions,
    },
    {
      id: SaleOrderSearchFields.ASSIGNED_BY,
      label: "Asignado a",
      kind: "catalog",
      operators: [{ id: SaleOrderSearchOperators.IN, label: "Es alguno de" }],
      supportsExclude: true,
      options: assigneeOptions,
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
      id: SaleOrderSearchFields.PAYMENT_STATUS,
      label: "Estado de pago",
      kind: "catalog",
      description: "Filtra por estado de pago (Pagado/Pendiente).",
      operators: [{ id: SaleOrderSearchOperators.IN, label: "Es alguno de" }],
      supportsExclude: true,
      options: paymentStatusOptions,
    },
    {
      id: SaleOrderSearchFields.WORKFLOW_ID,
      label: "Tipo",
      kind: "catalog",
      description: "Filtra por tipo de pedido.",
      operators: [{ id: SaleOrderSearchOperators.IN, label: "Es alguno de" }],
      supportsExclude: true,
      options: workflowOptions,
    },
    {
      id: SaleOrderSearchFields.SALE_ORDER_STATE_ID,
      label: "Estado",
      kind: "catalog",
      description: "Filtra por estado actual.",
      operators: [{ id: SaleOrderSearchOperators.IN, label: "Es alguno de" }],
      supportsExclude: true,
      options: stateOptions,
    },
    {
      id: SaleOrderSearchFields.BANK_ACCOUNT_ID,
      label: "Cuenta bancaria",
      kind: "catalog",
      description: "Filtra por cuenta bancaria usada en pagos.",
      operators: [{ id: SaleOrderSearchOperators.IN, label: "Es alguna de" }],
      supportsExclude: true,
      options: bankAccountOptions,
    },
    {
      id: SaleOrderSearchFields.CLIENT_TYPE,
      label: "Tipo de cliente",
      kind: "catalog",
      description: "Filtra por Nuevo, Rezagado o Recompra.",
      operators: [{ id: SaleOrderSearchOperators.IN, label: "Es alguno de" }],
      supportsExclude: true,
      options: clientTypeOptions,
    },
  ];
}
