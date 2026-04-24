import type {
  DataTableSearchChip,
  DataTableSearchOption,
  SmartSearchFieldConfig,
  SmartSearchOperatorOption,
  SmartSearchRule,
} from "@/components/table/search";

export type ProductSearchField =
  | "name"
  | "description"
  | "brand"
  | "status"
  | "skuCount"
  | "inventoryTotal";

export type ProductSearchFilterKey = ProductSearchField;

export type ProductSearchOperator =
  | "CONTAINS"
  | "EQ"
  | "GT"
  | "GTE"
  | "LT"
  | "LTE"
  | "IN";

export type ProductSearchRule = SmartSearchRule<ProductSearchField, ProductSearchOperator>;
export type ProductSearchFilters = ProductSearchRule[];
export type ProductSearchSnapshot = {
  q?: string;
  filters: ProductSearchFilters;
};
export type ProductSearchChip = DataTableSearchChip<ProductSearchFilterKey>;
export type ProductSmartSearchColumn = SmartSearchFieldConfig<ProductSearchFilterKey, ProductSearchOperator>;

const STATUS_OPTIONS: DataTableSearchOption[] = [
  { id: "true", label: "Activo" },
  { id: "false", label: "Desactivado" },
];

const TEXT_OPERATORS: SmartSearchOperatorOption<ProductSearchOperator>[] = [
  { id: "CONTAINS", label: "Contiene" },
  { id: "EQ", label: "Es igual a" },
];

const NUMBER_OPERATORS: SmartSearchOperatorOption<ProductSearchOperator>[] = [
  { id: "EQ", label: "Igual a" },
  { id: "GT", label: "Mayor que" },
  { id: "GTE", label: "Mayor o igual" },
  { id: "LT", label: "Menor que" },
  { id: "LTE", label: "Menor o igual" },
];

const FIELD_ORDER: ProductSearchField[] = [
  "name",
  "description",
  "brand",
  "status",
  "skuCount",
  "inventoryTotal",
];

const FIELD_LABELS: Record<ProductSearchField, string> = {
  name: "Nombre",
  description: "Descripción",
  brand: "Marca",
  status: "Estado",
  skuCount: "Variantes",
  inventoryTotal: "Stock",
};

const OPERATOR_LABELS: Partial<Record<ProductSearchOperator, string>> = {
  CONTAINS: "contiene",
  EQ: "=",
  GT: ">",
  GTE: ">=",
  LT: "<",
  LTE: "<=",
};

function uniqueStrings(values: string[] | undefined) {
  return Array.from(new Set((values ?? []).map((value) => value?.trim()).filter(Boolean))) as string[];
}

function sanitizeRule(rule?: Partial<ProductSearchRule> | null): ProductSearchRule | null {
  if (!rule?.field || !rule.operator) return null;

  if (rule.field === "status") {
    if (rule.operator !== "IN") return null;
    const values = uniqueStrings(rule.values ?? (rule.value ? [rule.value] : undefined));
    if (!values.length) return null;
    return {
      field: "status",
      operator: "IN",
      mode: rule.mode === "exclude" ? "exclude" : "include",
      values,
    };
  }

  if (rule.field === "skuCount" || rule.field === "inventoryTotal") {
    const value = rule.value?.trim();
    if (!value || Number.isNaN(Number(value))) return null;
    if (!["EQ", "GT", "GTE", "LT", "LTE"].includes(rule.operator)) return null;
    return { field: rule.field, operator: rule.operator, value };
  }

  if (rule.field === "name" || rule.field === "description" || rule.field === "brand") {
    const value = rule.value?.trim();
    if (!value) return null;
    if (!["CONTAINS", "EQ"].includes(rule.operator)) return null;
    return { field: rule.field, operator: rule.operator, value };
  }

  return null;
}

export function createEmptyProductSearchFilters(): ProductSearchFilters {
  return [];
}

export function sanitizeProductSearchSnapshot(
  snapshot?: Partial<ProductSearchSnapshot> | { q?: string; filters?: unknown } | null,
): ProductSearchSnapshot {
  const q = snapshot?.q?.trim();
  const rawFilters = Array.isArray(snapshot?.filters) ? snapshot.filters : [];
  const merged = new Map<ProductSearchField, ProductSearchRule>();

  rawFilters.forEach((rule) => {
    const normalized = sanitizeRule(rule as ProductSearchRule);
    if (!normalized) return;
    merged.set(normalized.field, normalized);
  });

  return {
    q: q || undefined,
    filters: FIELD_ORDER.map((field) => merged.get(field)).filter(Boolean) as ProductSearchRule[],
  };
}

export function hasProductSearchCriteria(snapshot?: Partial<ProductSearchSnapshot> | null) {
  const normalized = sanitizeProductSearchSnapshot(snapshot);
  return Boolean(normalized.q || normalized.filters.length);
}

export function findProductSearchRule(snapshot: ProductSearchSnapshot, key: ProductSearchFilterKey) {
  return sanitizeProductSearchSnapshot(snapshot).filters.find((rule) => rule.field === key) ?? null;
}

export function upsertProductSearchRule(snapshot: ProductSearchSnapshot, rule: ProductSearchRule) {
  const normalized = sanitizeProductSearchSnapshot(snapshot);
  const nextRule = sanitizeRule(rule);

  if (!nextRule) {
    return removeProductSearchKey(normalized, rule.field);
  }

  return sanitizeProductSearchSnapshot({
    ...normalized,
    filters: [...normalized.filters.filter((item) => item.field !== nextRule.field), nextRule],
  });
}

export function removeProductSearchKey(snapshot: ProductSearchSnapshot, key: "q" | ProductSearchFilterKey) {
  const normalized = sanitizeProductSearchSnapshot(snapshot);
  if (key === "q") {
    return sanitizeProductSearchSnapshot({ ...normalized, q: undefined });
  }

  return sanitizeProductSearchSnapshot({
    ...normalized,
    filters: normalized.filters.filter((rule) => rule.field !== key),
  });
}

export function buildProductSearchChips(snapshot: ProductSearchSnapshot): ProductSearchChip[] {
  const normalized = sanitizeProductSearchSnapshot(snapshot);
  const chips: ProductSearchChip[] = [];

  if (normalized.q) {
    chips.push({ id: "q", label: `Busqueda: ${normalized.q}`, removeKey: "q" });
  }

  normalized.filters.forEach((rule) => {
    const label = getProductSearchRuleSummary(normalized, rule.field);
    if (!label) return;
    chips.push({
      id: rule.field,
      label: `${FIELD_LABELS[rule.field]}: ${label}`,
      removeKey: rule.field,
    });
  });

  return chips;
}

export function getProductSearchSelectionCount(snapshot: ProductSearchSnapshot, key: ProductSearchFilterKey) {
  const rule = findProductSearchRule(snapshot, key);
  if (!rule) return 0;
  return rule.operator === "IN" ? rule.values?.length ?? 0 : 1;
}

export function getProductSearchRuleSummary(snapshot: ProductSearchSnapshot, key: ProductSearchFilterKey) {
  const rule = findProductSearchRule(snapshot, key);
  if (!rule) return null;

  if (rule.operator === "IN") {
    const labels = (rule.values ?? []).map((value) => STATUS_OPTIONS.find((option) => option.id === value)?.label ?? value);
    const content = labels.join(" - ");
    return rule.mode === "exclude" ? `Excluye ${content}` : content;
  }

  if (!rule.value) return null;
  return `${OPERATOR_LABELS[rule.operator] ?? rule.operator} ${rule.value}`;
}

export function buildProductSmartSearchColumns(): ProductSmartSearchColumn[] {
  return [
    {
      id: "name",
      label: "Nombre",
      kind: "text",
      description: "Busca por nombre del producto o materia prima.",
      operators: TEXT_OPERATORS,
      placeholder: "Ej. Gaseosa 500ml",
    },
    {
      id: "description",
      label: "Descripción",
      kind: "text",
      description: "Busca por la descripción registrada.",
      operators: TEXT_OPERATORS,
      placeholder: "Ej. Presentación retornable",
    },
    {
      id: "brand",
      label: "Marca",
      kind: "text",
      description: "Busca por la marca del item.",
      operators: TEXT_OPERATORS,
      placeholder: "Ej. Coca Cola",
    },
    {
      id: "status",
      label: "Estado",
      kind: "catalog",
      description: "Incluye o excluye estados.",
      operators: [{ id: "IN", label: "Es alguno de" }],
      supportsExclude: true,
      options: STATUS_OPTIONS,
    },
    {
      id: "skuCount",
      label: "Variantes",
      kind: "number",
      description: "Compara la cantidad de variantes.",
      operators: NUMBER_OPERATORS,
      placeholder: "Ej. 2",
    },
    {
      id: "inventoryTotal",
      label: "Stock",
      kind: "number",
      description: "Compara el stock total.",
      operators: NUMBER_OPERATORS,
      placeholder: "Ej. 100",
    },
  ];
}
