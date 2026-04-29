import type {
  DataTableSearchChip,
  DataTableSearchOption,
  SmartSearchFieldConfig,
  SmartSearchOperatorOption,
} from "@/shared/components/table/search";
import {
  InventorySearchFields,
  type InventorySearchField,
  type InventorySearchOperator,
  type InventorySearchRule,
  type InventorySearchSnapshot,
} from "@/features/catalog/types/inventorySearch";

export type { InventorySearchRule, InventorySearchSnapshot } from "@/features/catalog/types/inventorySearch";

export type InventoryNumericSearchField =
  | typeof InventorySearchFields.ON_HAND
  | typeof InventorySearchFields.RESERVED
  | typeof InventorySearchFields.AVAILABLE;

export type InventorySearchFilterKey = InventorySearchField;
export type InventorySearchFilters = InventorySearchRule[];

export type InventorySearchCatalogs = {
  warehouses: DataTableSearchOption[];
  skus?: DataTableSearchOption[];
};

export type InventorySearchLabels = {
  item: string;
};

export type InventorySearchChip = DataTableSearchChip<InventorySearchFilterKey>;

export type InventorySmartSearchColumn = SmartSearchFieldConfig<
  InventorySearchFilterKey,
  InventorySearchOperator
>;

type InventorySearchOperatorOption =
  SmartSearchOperatorOption<InventorySearchOperator>;

const IN_OPERATOR_OPTIONS: InventorySearchOperatorOption[] = [
  { id: "IN", label: "Es alguno de" },
];

const NUMBER_OPERATOR_OPTIONS: InventorySearchOperatorOption[] = [
  { id: "EQ", label: "Igual a" },
  { id: "GT", label: "Mayor que" },
  { id: "GTE", label: "Mayor o igual" },
  { id: "LT", label: "Menor que" },
  { id: "LTE", label: "Menor o igual" },
];

const FIELD_ORDER: InventorySearchField[] = [
  InventorySearchFields.SKU,
  InventorySearchFields.WAREHOUSE,
  InventorySearchFields.ON_HAND,
  InventorySearchFields.RESERVED,
  InventorySearchFields.AVAILABLE,
];

function uniqueStrings(values: string[] | undefined) {
  return Array.from(
    new Set((values ?? []).map((value) => value?.trim()).filter(Boolean)),
  ) as string[];
}

function sanitizeRule(
  rule?: Partial<InventorySearchRule> | null,
): InventorySearchRule | null {
  if (!rule?.field || !rule.operator) return null;

  if (rule.field === InventorySearchFields.WAREHOUSE) {
    if (rule.operator !== "IN") return null;

    const values = uniqueStrings(rule.values ?? (rule.value ? [rule.value] : []))
      .filter((value) => value !== "all");

    if (!values.length) return null;

    return {
      field: InventorySearchFields.WAREHOUSE,
      operator: "IN",
      mode: rule.mode === "exclude" ? "exclude" : "include",
      values,
    };
  }

  if (rule.field === InventorySearchFields.SKU) {
    if (rule.operator === "IN") {
      const values = uniqueStrings(rule.values ?? (rule.value ? [rule.value] : []));
      if (!values.length) return null;
      return {
        field: InventorySearchFields.SKU,
        operator: "IN",
        values,
      };
    }

    const value = rule.value?.trim();
    if (!value) return null;
    if (rule.operator !== "CONTAINS" && rule.operator !== "EQ") return null;
    return {
      field: InventorySearchFields.SKU,
      operator: rule.operator,
      value,
    };
  }

  if (
    rule.field === InventorySearchFields.ON_HAND ||
    rule.field === InventorySearchFields.RESERVED ||
    rule.field === InventorySearchFields.AVAILABLE
  ) {
    const value = rule.value?.trim();
    if (!value || Number.isNaN(Number(value))) return null;
    if (!["EQ", "GT", "GTE", "LT", "LTE"].includes(rule.operator)) return null;

    return {
      field: rule.field,
      operator: rule.operator,
      value,
    };
  }

  return null;
}

function getCatalogMaps(catalogs?: InventorySearchCatalogs | null) {
  return {
    warehouses: new Map(
      (catalogs?.warehouses ?? []).map((option) => [option.id, option.label]),
    ),
  };
}

function getItemLabel(labels?: InventorySearchLabels | null) {
  return labels?.item ?? "Producto (SKU)";
}

export function createEmptyInventorySearchFilters(): InventorySearchFilters {
  return [];
}

export function createEmptyInventorySearchSnapshot(): InventorySearchSnapshot {
  return {
    filters: createEmptyInventorySearchFilters(),
  };
}

export function sanitizeInventorySearchSnapshot(
  snapshot?:
    | Partial<InventorySearchSnapshot>
    | { q?: string; filters?: unknown }
    | null,
): InventorySearchSnapshot {
  const q = snapshot?.q?.trim();
  const rawFilters = Array.isArray(snapshot?.filters) ? snapshot.filters : [];
  const merged = new Map<InventorySearchField, InventorySearchRule>();

  rawFilters.forEach((rule) => {
    const normalized = sanitizeRule(rule as InventorySearchRule);
    if (!normalized) return;
    merged.set(normalized.field, normalized);
  });

  return {
    q: q || undefined,
    filters: FIELD_ORDER.map((field) => merged.get(field)).filter(Boolean) as InventorySearchRule[],
  };
}

export function hasInventorySearchCriteria(
  snapshot?: Partial<InventorySearchSnapshot> | null,
) {
  const normalized = sanitizeInventorySearchSnapshot(snapshot);
  return Boolean(normalized.q || normalized.filters.length);
}

export function findInventorySearchRule(
  snapshot: InventorySearchSnapshot,
  key: InventorySearchFilterKey,
) {
  return (
    sanitizeInventorySearchSnapshot(snapshot).filters.find((rule) => rule.field === key) ??
    null
  );
}

export function upsertInventorySearchRule(
  snapshot: InventorySearchSnapshot,
  rule: InventorySearchRule,
) {
  const normalized = sanitizeInventorySearchSnapshot(snapshot);
  const sanitizedRule = sanitizeRule(rule);

  if (!sanitizedRule) {
    return removeInventorySearchKey(normalized, rule.field);
  }

  return sanitizeInventorySearchSnapshot({
    ...normalized,
    filters: [
      ...normalized.filters.filter((item) => item.field !== sanitizedRule.field),
      sanitizedRule,
    ],
  });
}

export function removeInventorySearchKey(
  snapshot: InventorySearchSnapshot,
  key: "q" | InventorySearchFilterKey,
) {
  const normalized = sanitizeInventorySearchSnapshot(snapshot);

  if (key === "q") {
    return sanitizeInventorySearchSnapshot({
      ...normalized,
      q: undefined,
    });
  }

  return sanitizeInventorySearchSnapshot({
    ...normalized,
    filters: normalized.filters.filter((rule) => rule.field !== key),
  });
}

export function getInventorySearchSelectionCount(
  snapshot: InventorySearchSnapshot,
  key: InventorySearchFilterKey,
) {
  const rule = findInventorySearchRule(snapshot, key);
  if (!rule) return 0;
  return rule.operator === "IN" ? rule.values?.length ?? 0 : 1;
}

export function getInventorySearchRuleSummary(
  snapshot: InventorySearchSnapshot,
  key: InventorySearchFilterKey,
  catalogs?: InventorySearchCatalogs | null,
) {
  const rule = findInventorySearchRule(snapshot, key);
  if (!rule) return null;

  if (rule.operator === "IN") {
    const map =
      key === InventorySearchFields.SKU
        ? new Map((catalogs?.skus ?? []).map((option) => [option.id, option.label]))
        : getCatalogMaps(catalogs).warehouses;
    const labels = (rule.values ?? []).map((value) => map.get(value) ?? value);
    const content = labels.join(" - ");
    return rule.mode === "exclude" ? `Excluye: ${content}` : content;
  }

  if (rule.field === InventorySearchFields.SKU) {
    const operatorLabel = rule.operator === "CONTAINS" ? "contiene" : "=";
    return `${operatorLabel} ${rule.value ?? ""}`.trim();
  }

  return `${rule.operator} ${rule.value ?? ""}`.trim();
}

export function buildInventorySearchChips(
  snapshot: InventorySearchSnapshot,
  catalogs?: InventorySearchCatalogs | null,
  labels?: InventorySearchLabels,
): InventorySearchChip[] {
  const normalized = sanitizeInventorySearchSnapshot(snapshot);
  const chips: InventorySearchChip[] = [];

  if (normalized.q) {
    chips.push({
      id: "q",
      label: `Busqueda: ${normalized.q}`,
      removeKey: "q",
    });
  }

  const skuRule = findInventorySearchRule(normalized, InventorySearchFields.SKU);
  if ((skuRule?.values?.length ?? 0) > 0 || Boolean(skuRule?.value)) {
    const label = getInventorySearchRuleSummary(normalized, InventorySearchFields.SKU, catalogs);
    if (label) {
      chips.push({
        id: InventorySearchFields.SKU,
        label: `${getItemLabel(labels)}: ${label}`,
        removeKey: InventorySearchFields.SKU,
      });
    }
  }

  const warehouseRule = findInventorySearchRule(normalized, InventorySearchFields.WAREHOUSE);
  if (warehouseRule?.values?.length) {
    const label = getInventorySearchRuleSummary(normalized, InventorySearchFields.WAREHOUSE, catalogs);
    if (label) {
      chips.push({
        id: InventorySearchFields.WAREHOUSE,
        label: `Almacen: ${label}`,
        removeKey: InventorySearchFields.WAREHOUSE,
      });
    }
  }

  (
    [
      InventorySearchFields.ON_HAND,
      InventorySearchFields.RESERVED,
      InventorySearchFields.AVAILABLE,
    ] as InventoryNumericSearchField[]
  ).forEach((field) => {
    const label = getInventorySearchRuleSummary(normalized, field, catalogs);
    if (!label) return;

    chips.push({
      id: field,
      label: `${
        field === InventorySearchFields.ON_HAND
          ? "Stock"
          : field === InventorySearchFields.RESERVED
            ? "Reservado"
            : "Disponible"
      }: ${label}`,
      removeKey: field,
    });
  });

  return chips;
}

export function buildInventorySmartSearchColumns(
  catalogs?: InventorySearchCatalogs | null,
  labels?: InventorySearchLabels,
  options?: { onSearchSku?: (query: string) => void },
): InventorySmartSearchColumn[] {
  return [
    {
      id: InventorySearchFields.SKU,
      label: getItemLabel(labels),
      kind: "catalog",
      description: "Selecciona uno o varios productos.",
      operators: IN_OPERATOR_OPTIONS,
      options: catalogs?.skus ?? [],
      onSearch: options?.onSearchSku,
    },
    {
      id: InventorySearchFields.WAREHOUSE,
      label: "Almacen",
      kind: "catalog",
      description: "Selecciona uno o varios almacenes y define si se incluyen o excluyen.",
      operators: IN_OPERATOR_OPTIONS,
      supportsExclude: true,
      options: catalogs?.warehouses ?? [],
    },
    {
      id: InventorySearchFields.ON_HAND,
      label: "Stock",
      kind: "number",
      description: "Compara el stock total del registro.",
      operators: NUMBER_OPERATOR_OPTIONS,
      placeholder: "Ej. 50",
    },
    {
      id: InventorySearchFields.RESERVED,
      label: "Reservado",
      kind: "number",
      description: "Compara la cantidad reservada.",
      operators: NUMBER_OPERATOR_OPTIONS,
      placeholder: "Ej. 10",
    },
    {
      id: InventorySearchFields.AVAILABLE,
      label: "Disponible",
      kind: "number",
      description: "Compara el disponible del inventario.",
      operators: NUMBER_OPERATOR_OPTIONS,
      placeholder: "Ej. 40",
    },
  ];
}
