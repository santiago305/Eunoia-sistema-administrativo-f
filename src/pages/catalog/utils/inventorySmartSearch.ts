import type {
  DataTableSearchChip,
  DataTableSearchOption,
  SmartSearchFieldConfig,
  SmartSearchOperatorOption,
  SmartSearchRule,
} from "@/components/table/search";

export type InventorySearchField = "warehouse";
export type InventorySearchFilterKey = InventorySearchField;

export type InventorySearchOperator = "IN";

export type InventorySearchRule = SmartSearchRule<
  InventorySearchField,
  InventorySearchOperator
>;

export type InventorySearchFilters = InventorySearchRule[];

export type InventorySearchSnapshot = {
  q?: string;
  filters: InventorySearchFilters;
};

export type InventorySearchCatalogs = {
  warehouses: DataTableSearchOption[];
};

export type InventorySearchChip = DataTableSearchChip<InventorySearchFilterKey>;

export type InventorySmartSearchColumn = SmartSearchFieldConfig<
  InventorySearchFilterKey,
  InventorySearchOperator
>;

type InventorySearchOperatorOption =
  SmartSearchOperatorOption<InventorySearchOperator>;

const InventorySearchOperators = {
  IN: "IN",
} as const;

const OPERATOR_OPTIONS: InventorySearchOperatorOption[] = [
  { id: InventorySearchOperators.IN, label: "Es alguno de" },
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
  if (rule.field !== "warehouse") return null;
  if (rule.operator !== InventorySearchOperators.IN) return null;

  const values = uniqueStrings(rule.values ?? (rule.value ? [rule.value] : []))
    .filter((value) => value !== "all");

  if (!values.length) return null;

  return {
    field: "warehouse",
    operator: InventorySearchOperators.IN,
    mode: rule.mode === "exclude" ? "exclude" : "include",
    values,
  };
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
    filters: Array.from(merged.values()),
  };
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

function getCatalogMaps(catalogs?: InventorySearchCatalogs | null) {
  return {
    warehouses: new Map(
      (catalogs?.warehouses ?? []).map((option) => [option.id, option.label]),
    ),
  };
}

export function getInventorySearchSelectionCount(
  snapshot: InventorySearchSnapshot,
  key: InventorySearchFilterKey,
) {
  const rule = findInventorySearchRule(snapshot, key);
  if (!rule) return 0;
  return rule.operator === InventorySearchOperators.IN ? rule.values?.length ?? 0 : 1;
}

export function getInventorySearchRuleSummary(
  snapshot: InventorySearchSnapshot,
  key: InventorySearchFilterKey,
  catalogs?: InventorySearchCatalogs | null,
) {
  const rule = findInventorySearchRule(snapshot, key);
  if (!rule) return null;

  if (rule.operator !== InventorySearchOperators.IN) return null;

  const map = getCatalogMaps(catalogs).warehouses;
  const labels = (rule.values ?? []).map((value) => map.get(value) ?? value);
  const content = labels.join(" - ");
  return rule.mode === "exclude" ? `Excluye: ${content}` : content;
}

export function buildInventorySearchChips(
  snapshot: InventorySearchSnapshot,
  catalogs?: InventorySearchCatalogs | null,
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

  const warehouseRule = findInventorySearchRule(normalized, "warehouse");
  if (warehouseRule?.values?.length) {
    const label = getInventorySearchRuleSummary(normalized, "warehouse", catalogs);
    if (label) {
      chips.push({
        id: "warehouse",
        label: `Almacén: ${label}`,
        removeKey: "warehouse",
      });
    }
  }

  return chips;
}

export function buildInventorySmartSearchColumns(
  catalogs?: InventorySearchCatalogs | null,
): InventorySmartSearchColumn[] {
  return [
    {
      id: "warehouse",
      label: "Almacén",
      kind: "catalog",
      description: "Selecciona uno o varios almacenes y define si se incluyen o excluyen.",
      operators: OPERATOR_OPTIONS,
      supportsExclude: true,
      options: catalogs?.warehouses ?? [],
    },
  ];
}
