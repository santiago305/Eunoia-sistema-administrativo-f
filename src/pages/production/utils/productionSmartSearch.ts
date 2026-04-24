import type {
  DataTableSearchChip,
  SmartSearchFieldConfig,
  SmartSearchOperatorOption,
} from "@/components/table/search";
import type {
  ProductionSearchField,
  ProductionSearchFilters,
  ProductionSearchOperator,
  ProductionSearchRule,
  ProductionSearchSnapshot,
  ProductionSearchStateResponse,
} from "@/pages/production/types/production";
import {
  ProductionSearchFields,
  ProductionSearchOperators,
} from "@/pages/production/types/production";

export type ProductionSearchFilterKey = ProductionSearchField;

export type ProductionSearchChip = DataTableSearchChip<ProductionSearchFilterKey>;

export type ProductionSmartSearchColumn = SmartSearchFieldConfig<
  ProductionSearchFilterKey,
  ProductionSearchOperator
>;

type ProductionSearchOperatorOption = SmartSearchOperatorOption<ProductionSearchOperator>;

const FIELD_ORDER: ProductionSearchField[] = [
  ProductionSearchFields.MANUFACTURE_DATE,
  ProductionSearchFields.NUMBER,
  ProductionSearchFields.REFERENCE,
  ProductionSearchFields.FROM_WAREHOUSE_ID,
  ProductionSearchFields.TO_WAREHOUSE_ID,
  ProductionSearchFields.STATUS,
  ProductionSearchFields.SKU_ID,
];

const FIELD_LABELS: Record<ProductionSearchField, string> = {
  [ProductionSearchFields.MANUFACTURE_DATE]: "Registro",
  [ProductionSearchFields.NUMBER]: "Serie o correlativo",
  [ProductionSearchFields.REFERENCE]: "Referencia",
  [ProductionSearchFields.FROM_WAREHOUSE_ID]: "Almacen origen",
  [ProductionSearchFields.TO_WAREHOUSE_ID]: "Almacen destino",
  [ProductionSearchFields.STATUS]: "Estado",
  [ProductionSearchFields.SKU_ID]: "Producto terminado (SKU)",
};

const CATALOG_FIELDS = new Set<ProductionSearchField>([
  ProductionSearchFields.FROM_WAREHOUSE_ID,
  ProductionSearchFields.TO_WAREHOUSE_ID,
  ProductionSearchFields.STATUS,
  ProductionSearchFields.SKU_ID,
]);

const TEXT_FIELDS = new Set<ProductionSearchField>([
  ProductionSearchFields.NUMBER,
  ProductionSearchFields.REFERENCE,
]);

const DATE_FIELDS = new Set<ProductionSearchField>([
  ProductionSearchFields.MANUFACTURE_DATE,
]);

const TEXT_OPERATOR_OPTIONS: ProductionSearchOperatorOption[] = [
  { id: ProductionSearchOperators.CONTAINS, label: "Contiene" },
  { id: ProductionSearchOperators.EQ, label: "Es igual a" },
];

const DATE_OPERATOR_OPTIONS: ProductionSearchOperatorOption[] = [
  { id: ProductionSearchOperators.ON, label: "Es" },
  { id: ProductionSearchOperators.AFTER, label: "Despues de" },
  { id: ProductionSearchOperators.BEFORE, label: "Antes de" },
  { id: ProductionSearchOperators.BETWEEN, label: "Entre" },
];

const OPERATOR_LABELS: Record<ProductionSearchOperator, string> = {
  [ProductionSearchOperators.IN]: ":",
  [ProductionSearchOperators.CONTAINS]: "contiene",
  [ProductionSearchOperators.EQ]: "=",
  [ProductionSearchOperators.ON]: "=",
  [ProductionSearchOperators.AFTER]: ">",
  [ProductionSearchOperators.BEFORE]: "<",
  [ProductionSearchOperators.BETWEEN]: "entre",
};

function uniqueStrings(values: string[] | undefined) {
  return Array.from(
    new Set((values ?? []).map((value) => value?.trim()).filter(Boolean)),
  ) as string[];
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
  return `${String(parsed.getDate()).padStart(2, "0")}/${String(parsed.getMonth() + 1).padStart(2, "0")}/${parsed.getFullYear()}`;
}

function normalizeLegacyField(field?: string | null): ProductionSearchField | null {
  if (field === "productId") return ProductionSearchFields.SKU_ID;
  if (field === "serie") return ProductionSearchFields.NUMBER;
  return field && Object.values(ProductionSearchFields).includes(field as ProductionSearchField)
    ? (field as ProductionSearchField)
    : null;
}

function sanitizeRule(rule?: Partial<ProductionSearchRule> | null): ProductionSearchRule | null {
  if (!rule?.field || !rule.operator) return null;
  const field = normalizeLegacyField(rule.field);
  if (!field) return null;
  if (!Object.values(ProductionSearchOperators).includes(rule.operator)) return null;

  if (CATALOG_FIELDS.has(field)) {
    if (rule.operator !== ProductionSearchOperators.IN) return null;
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
      rule.operator !== ProductionSearchOperators.CONTAINS &&
      rule.operator !== ProductionSearchOperators.EQ
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

  if (DATE_FIELDS.has(field)) {
    if (
      rule.operator !== ProductionSearchOperators.ON &&
      rule.operator !== ProductionSearchOperators.AFTER &&
      rule.operator !== ProductionSearchOperators.BEFORE &&
      rule.operator !== ProductionSearchOperators.BETWEEN
    ) {
      return null;
    }

    if (rule.operator === ProductionSearchOperators.BETWEEN) {
      const start = normalizeDateValue(rule.range?.start);
      const end = normalizeDateValue(rule.range?.end);
      if (!start || !end) return null;
      return {
        field,
        operator: rule.operator,
        range: { start, end },
      };
    }

    const value = normalizeDateValue(rule.value);
    if (!value) return null;
    return {
      field,
      operator: rule.operator,
      value,
    };
  }

  return null;
}

function getCatalogMaps(searchState?: ProductionSearchStateResponse | null) {
  return {
    warehouse: new Map(
      (searchState?.catalogs.warehouses ?? []).map((item) => [item.id, item.label]),
    ),
    status: new Map(
      (searchState?.catalogs.statuses ?? []).map((item) => [item.id, item.label]),
    ),
    product: new Map(
      (searchState?.catalogs.products ?? []).map((item) => [item.id, item.label]),
    ),
  };
}

function getCatalogLabels(
  field: ProductionSearchField,
  values: string[],
  searchState?: ProductionSearchStateResponse | null,
) {
  const maps = getCatalogMaps(searchState);
  const map =
    field === ProductionSearchFields.FROM_WAREHOUSE_ID
      ? maps.warehouse
      : field === ProductionSearchFields.TO_WAREHOUSE_ID
        ? maps.warehouse
        : field === ProductionSearchFields.STATUS
          ? maps.status
          : field === ProductionSearchFields.SKU_ID
            ? maps.product
            : new Map<string, string>();

  return values.map((value) => map.get(value) ?? value);
}

function getRuleLabel(
  rule: ProductionSearchRule,
  searchState?: ProductionSearchStateResponse | null,
  includeFieldLabel = true,
) {
  const fieldLabel = FIELD_LABELS[rule.field];

  if (rule.operator === ProductionSearchOperators.IN) {
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

  if (rule.operator === ProductionSearchOperators.BETWEEN) {
    if (!rule.range?.start || !rule.range?.end) return includeFieldLabel ? fieldLabel : "";
    const content = `${formatRuleValueLabel(rule.range.start)} y ${formatRuleValueLabel(rule.range.end)}`;
    return includeFieldLabel
      ? `${fieldLabel} ${OPERATOR_LABELS[rule.operator]} ${content}`
      : `${OPERATOR_LABELS[rule.operator]} ${content}`;
  }

  if (!rule.value) return includeFieldLabel ? fieldLabel : "";
  const content = `${OPERATOR_LABELS[rule.operator]} ${formatRuleValueLabel(rule.value)}`;
  return includeFieldLabel ? `${fieldLabel} ${content}` : content;
}

export function createEmptyProductionSearchFilters(): ProductionSearchFilters {
  return [];
}

export function createEmptyProductionSearchSnapshot(): ProductionSearchSnapshot {
  return {
    filters: createEmptyProductionSearchFilters(),
  };
}

export function sanitizeProductionSearchSnapshot(
  snapshot?: Partial<ProductionSearchSnapshot> | { q?: string; filters?: unknown } | null,
): ProductionSearchSnapshot {
  const q = snapshot?.q?.trim();
  const rawFilters = Array.isArray(snapshot?.filters) ? snapshot.filters : [];
  const mergedByField = new Map<ProductionSearchField, ProductionSearchRule>();

  rawFilters.forEach((rule) => {
    const normalized = sanitizeRule(rule as ProductionSearchRule);
    if (!normalized) return;
    mergedByField.set(normalized.field, normalized);
  });

  return {
    q: q || undefined,
    filters: FIELD_ORDER.map((field) => mergedByField.get(field)).filter(Boolean) as ProductionSearchRule[],
  };
}

export function hasProductionSearchCriteria(snapshot: ProductionSearchSnapshot) {
  return Boolean(snapshot.q || snapshot.filters.length);
}

export function findProductionSearchRule(
  snapshot: ProductionSearchSnapshot,
  key: ProductionSearchFilterKey,
) {
  return sanitizeProductionSearchSnapshot(snapshot).filters.find((rule) => rule.field === key) ?? null;
}

export function upsertProductionSearchRule(
  snapshot: ProductionSearchSnapshot,
  rule: ProductionSearchRule,
) {
  const normalized = sanitizeProductionSearchSnapshot(snapshot);
  return sanitizeProductionSearchSnapshot({
    ...normalized,
    filters: [...normalized.filters.filter((item) => item.field !== rule.field), rule],
  });
}

export function removeProductionSearchKey(
  snapshot: ProductionSearchSnapshot,
  key: "q" | ProductionSearchFilterKey,
) {
  const normalized = sanitizeProductionSearchSnapshot(snapshot);

  if (key === "q") {
    return sanitizeProductionSearchSnapshot({
      ...normalized,
      q: undefined,
    });
  }

  return sanitizeProductionSearchSnapshot({
    ...normalized,
    filters: normalized.filters.filter((rule) => rule.field !== key),
  });
}

export function buildProductionSearchChips(
  snapshot: ProductionSearchSnapshot,
  searchState?: ProductionSearchStateResponse | null,
): ProductionSearchChip[] {
  const normalized = sanitizeProductionSearchSnapshot(snapshot);
  const chips: ProductionSearchChip[] = [];

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

export function getProductionSearchSelectionCount(
  snapshot: ProductionSearchSnapshot,
  key: ProductionSearchFilterKey,
) {
  const rule = findProductionSearchRule(snapshot, key);
  if (!rule) return 0;
  return rule.operator === ProductionSearchOperators.IN ? rule.values?.length ?? 0 : 1;
}

export function getProductionSearchRuleSummary(
  snapshot: ProductionSearchSnapshot,
  key: ProductionSearchFilterKey,
  searchState?: ProductionSearchStateResponse | null,
) {
  const rule = findProductionSearchRule(snapshot, key);
  if (!rule) return null;
  return getRuleLabel(rule, searchState, false);
}

export function buildProductionSmartSearchColumns(
  searchState?: ProductionSearchStateResponse | null,
): ProductionSmartSearchColumn[] {
  return [
    {
      id: ProductionSearchFields.MANUFACTURE_DATE,
      label: "Registro",
      kind: "date",
      description: "Busca por fecha de registro de la orden de produccion.",
      operators: DATE_OPERATOR_OPTIONS,
      operatorInputMode: {
        [ProductionSearchOperators.ON]: "date",
        [ProductionSearchOperators.AFTER]: "date",
        [ProductionSearchOperators.BEFORE]: "date",
        [ProductionSearchOperators.BETWEEN]: "date-range",
      },
      operatorPlaceholder: {
        [ProductionSearchOperators.ON]: "Selecciona una fecha",
        [ProductionSearchOperators.AFTER]: "Selecciona una fecha",
        [ProductionSearchOperators.BEFORE]: "Selecciona una fecha",
      },
    },
    {
      id: ProductionSearchFields.NUMBER,
      label: "Serie o correlativo",
      kind: "text",
      description: "Busca por serie o correlativo mostrado en la tabla.",
      operators: TEXT_OPERATOR_OPTIONS,
      placeholder: "Ej. PR-001 - 12",
    },
    {
      id: ProductionSearchFields.REFERENCE,
      label: "Referencia",
      kind: "text",
      description: "Busca por referencia registrada en la orden.",
      operators: TEXT_OPERATOR_OPTIONS,
      placeholder: "Ej. Lote abril",
    },
    {
      id: ProductionSearchFields.FROM_WAREHOUSE_ID,
      label: "Almacen origen",
      kind: "catalog",
      description: "Selecciona uno o varios almacenes de origen.",
      operators: [{ id: ProductionSearchOperators.IN, label: "Es alguno de" }],
      supportsExclude: true,
      options: searchState?.catalogs.warehouses ?? [],
    },
    {
      id: ProductionSearchFields.TO_WAREHOUSE_ID,
      label: "Almacen destino",
      kind: "catalog",
      description: "Selecciona uno o varios almacenes de destino.",
      operators: [{ id: ProductionSearchOperators.IN, label: "Es alguno de" }],
      supportsExclude: true,
      options: searchState?.catalogs.warehouses ?? [],
    },
    {
      id: ProductionSearchFields.STATUS,
      label: "Estado",
      kind: "catalog",
      description: "Selecciona estados para incluir o excluir.",
      operators: [{ id: ProductionSearchOperators.IN, label: "Es alguno de" }],
      supportsExclude: true,
      options: searchState?.catalogs.statuses ?? [],
    },
    {
      id: ProductionSearchFields.SKU_ID,
      label: "Producto terminado (SKU)",
      kind: "catalog",
      description: "Selecciona SKUs terminados incluidos en la orden.",
      operators: [{ id: ProductionSearchOperators.IN, label: "Es alguno de" }],
      supportsExclude: true,
      options: searchState?.catalogs.products ?? [],
    },
  ];
}
