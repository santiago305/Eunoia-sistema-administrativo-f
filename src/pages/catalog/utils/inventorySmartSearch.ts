import type {
  DataTableSearchChip,
  DataTableSearchOption,
  SmartSearchFieldConfig,
  SmartSearchOperatorOption,
  SmartSearchRule,
} from "@/components/table/search";

export type InventoryNumericSearchField = "onHand" | "reserved" | "available";
export type InventorySearchField = "warehouse" | InventoryNumericSearchField;
export type InventorySearchFilterKey = InventorySearchField;

export type InventorySearchOperator = "IN" | "EQ" | "GT" | "GTE" | "LT" | "LTE";

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
  EQ: "EQ",
  GT: "GT",
  GTE: "GTE",
  LT: "LT",
  LTE: "LTE",
} as const;

const OPERATOR_OPTIONS: InventorySearchOperatorOption[] = [
  { id: InventorySearchOperators.IN, label: "Es alguno de" },
];

const NUMBER_OPERATOR_OPTIONS: InventorySearchOperatorOption[] = [
  { id: InventorySearchOperators.EQ, label: "Igual a" },
  { id: InventorySearchOperators.GT, label: "Mayor que" },
  { id: InventorySearchOperators.GTE, label: "Mayor o igual" },
  { id: InventorySearchOperators.LT, label: "Menor que" },
  { id: InventorySearchOperators.LTE, label: "Menor o igual" },
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
  if (rule.field === "warehouse") {
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

  if (rule.field === "onHand" || rule.field === "reserved" || rule.field === "available") {
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

  if (rule.operator === InventorySearchOperators.IN) {
    const map = getCatalogMaps(catalogs).warehouses;
    const labels = (rule.values ?? []).map((value) => map.get(value) ?? value);
    const content = labels.join(" - ");
    return rule.mode === "exclude" ? `Excluye: ${content}` : content;
  }

  return `${rule.operator} ${rule.value ?? ""}`.trim();
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

  (["onHand", "reserved", "available"] as InventoryNumericSearchField[]).forEach((field) => {
    const label = getInventorySearchRuleSummary(normalized, field, catalogs);
    if (!label) return;
    chips.push({
      id: field,
      label: `${field === "onHand" ? "Stock" : field === "reserved" ? "Reservado" : "Disponible"}: ${label}`,
      removeKey: field,
    });
  });

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
    {
      id: "onHand",
      label: "Stock",
      kind: "number",
      description: "Compara el stock total del registro.",
      operators: NUMBER_OPERATOR_OPTIONS,
      placeholder: "Ej. 50",
    },
    {
      id: "reserved",
      label: "Reservado",
      kind: "number",
      description: "Compara la cantidad reservada.",
      operators: NUMBER_OPERATOR_OPTIONS,
      placeholder: "Ej. 10",
    },
    {
      id: "available",
      label: "Disponible",
      kind: "number",
      description: "Compara el disponible del inventario.",
      operators: NUMBER_OPERATOR_OPTIONS,
      placeholder: "Ej. 40",
    },
  ];
}
