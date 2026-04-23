import type {
  DataTableSearchChip,
  DataTableSearchOption,
  SmartSearchFieldConfig,
  SmartSearchOperatorOption,
  SmartSearchRule,
} from "@/components/table/search";
import type { LedgerEntry } from "@/pages/catalog/types/kardex";

export type LedgerSearchField = "direction" | "document" | "thirdParty";
export type LedgerSearchFilterKey = LedgerSearchField;
export type LedgerSearchOperator = "IN" | "CONTAINS" | "EQ";
export type LedgerSearchRule = SmartSearchRule<LedgerSearchField, LedgerSearchOperator>;
export type LedgerSearchFilters = LedgerSearchRule[];
export type LedgerSearchSnapshot = {
  q?: string;
  filters: LedgerSearchFilters;
};
export type LedgerSearchChip = DataTableSearchChip<LedgerSearchFilterKey>;
export type LedgerSmartSearchColumn = SmartSearchFieldConfig<LedgerSearchFilterKey, LedgerSearchOperator>;

const DIRECTION_OPTIONS: DataTableSearchOption[] = [
  { id: "IN", label: "Entrada" },
  { id: "OUT", label: "Salida" },
];

const TEXT_OPERATORS: SmartSearchOperatorOption<LedgerSearchOperator>[] = [
  { id: "CONTAINS", label: "Contiene" },
  { id: "EQ", label: "Es igual a" },
];

function normalizeText(value?: string | null) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function uniqueStrings(values: string[] | undefined) {
  return Array.from(new Set((values ?? []).map((value) => value?.trim()).filter(Boolean))) as string[];
}

function sanitizeRule(rule?: Partial<LedgerSearchRule> | null): LedgerSearchRule | null {
  if (!rule?.field || !rule.operator) return null;

  if (rule.field === "direction") {
    if (rule.operator !== "IN") return null;
    const values = uniqueStrings(rule.values ?? (rule.value ? [rule.value] : undefined));
    if (!values.length) return null;
    return { field: "direction", operator: "IN", values };
  }

  if (rule.field === "document" || rule.field === "thirdParty") {
    const value = rule.value?.trim();
    if (!value) return null;
    if (!["CONTAINS", "EQ"].includes(rule.operator)) return null;
    return { field: rule.field, operator: rule.operator, value };
  }

  return null;
}

export function sanitizeLedgerSearchSnapshot(
  snapshot?: Partial<LedgerSearchSnapshot> | { q?: string; filters?: unknown } | null,
): LedgerSearchSnapshot {
  const q = snapshot?.q?.trim();
  const rawFilters = Array.isArray(snapshot?.filters) ? snapshot.filters : [];
  const merged = new Map<LedgerSearchField, LedgerSearchRule>();

  rawFilters.forEach((rule) => {
    const normalized = sanitizeRule(rule as LedgerSearchRule);
    if (!normalized) return;
    merged.set(normalized.field, normalized);
  });

  return {
    q: q || undefined,
    filters: ["direction", "document", "thirdParty"]
      .map((field) => merged.get(field as LedgerSearchField))
      .filter(Boolean) as LedgerSearchRule[],
  };
}

export function createEmptyLedgerSearchFilters(): LedgerSearchFilters {
  return [];
}

export function findLedgerSearchRule(snapshot: LedgerSearchSnapshot, key: LedgerSearchFilterKey) {
  return sanitizeLedgerSearchSnapshot(snapshot).filters.find((rule) => rule.field === key) ?? null;
}

export function upsertLedgerSearchRule(snapshot: LedgerSearchSnapshot, rule: LedgerSearchRule) {
  const normalized = sanitizeLedgerSearchSnapshot(snapshot);
  const nextRule = sanitizeRule(rule);
  if (!nextRule) return removeLedgerSearchKey(normalized, rule.field);
  return sanitizeLedgerSearchSnapshot({
    ...normalized,
    filters: [...normalized.filters.filter((item) => item.field !== nextRule.field), nextRule],
  });
}

export function removeLedgerSearchKey(snapshot: LedgerSearchSnapshot, key: "q" | LedgerSearchFilterKey) {
  const normalized = sanitizeLedgerSearchSnapshot(snapshot);
  if (key === "q") return sanitizeLedgerSearchSnapshot({ ...normalized, q: undefined });
  return sanitizeLedgerSearchSnapshot({
    ...normalized,
    filters: normalized.filters.filter((rule) => rule.field !== key),
  });
}

export function buildLedgerSmartSearchColumns(): LedgerSmartSearchColumn[] {
  return [
    {
      id: "direction",
      label: "Tipo",
      kind: "catalog",
      description: "Filtra entradas o salidas.",
      operators: [{ id: "IN", label: "Es alguno de" }],
      options: DIRECTION_OPTIONS,
    },
    {
      id: "document",
      label: "Documento",
      kind: "text",
      description: "Busca por serie o correlativo.",
      operators: TEXT_OPERATORS,
      placeholder: "Ej. T001-45",
    },
    {
      id: "thirdParty",
      label: "Proveedor / Cliente",
      kind: "text",
      description: "Busca por el tercero relacionado.",
      operators: TEXT_OPERATORS,
      placeholder: "Ej. Alicorp",
    },
  ];
}

export function getLedgerSearchSelectionCount(snapshot: LedgerSearchSnapshot, key: LedgerSearchFilterKey) {
  const rule = findLedgerSearchRule(snapshot, key);
  if (!rule) return 0;
  return rule.operator === "IN" ? rule.values?.length ?? 0 : 1;
}

export function getLedgerSearchRuleSummary(snapshot: LedgerSearchSnapshot, key: LedgerSearchFilterKey) {
  const rule = findLedgerSearchRule(snapshot, key);
  if (!rule) return null;
  if (rule.operator === "IN") {
    return (rule.values ?? []).map((value) => DIRECTION_OPTIONS.find((option) => option.id === value)?.label ?? value).join(" - ");
  }
  return `${rule.operator === "CONTAINS" ? "contiene" : "="} ${rule.value ?? ""}`.trim();
}

export function buildLedgerSearchChips(snapshot: LedgerSearchSnapshot): LedgerSearchChip[] {
  const normalized = sanitizeLedgerSearchSnapshot(snapshot);
  const chips: LedgerSearchChip[] = [];

  if (normalized.q) {
    chips.push({ id: "q", label: `Busqueda: ${normalized.q}`, removeKey: "q" });
  }

  normalized.filters.forEach((rule) => {
    const label = getLedgerSearchRuleSummary(normalized, rule.field);
    if (!label) return;
    chips.push({
      id: rule.field,
      label: `${rule.field === "direction" ? "Tipo" : rule.field === "document" ? "Documento" : "Proveedor / Cliente"}: ${label}`,
      removeKey: rule.field,
    });
  });

  return chips;
}

function matchText(value: string, rule: LedgerSearchRule | null) {
  if (!rule || !rule.value) return true;
  const left = normalizeText(value);
  const right = normalizeText(rule.value);
  if (!right) return true;
  if (rule.operator === "EQ") return left === right;
  return left.includes(right);
}

export function filterLedgerRows(rows: LedgerEntry[], snapshot: LedgerSearchSnapshot) {
  const normalized = sanitizeLedgerSearchSnapshot(snapshot);
  const q = normalizeText(normalized.q);
  const directionRule = findLedgerSearchRule(normalized, "direction");
  const documentRule = findLedgerSearchRule(normalized, "document");
  const thirdPartyRule = findLedgerSearchRule(normalized, "thirdParty");

  return rows.filter((row) => {
    const thirdParty =
      row.reference?.type === "PURCHASE"
        ? `${row.reference.purchase?.supplier?.name ?? ""} ${row.reference.purchase?.supplier?.documentNumber ?? ""}`.trim()
        : "";
    const document = row.reference?.type === "PURCHASE"
      ? `${row.reference.purchase?.serie ?? ""}-${row.reference.purchase?.correlative ?? ""}`
      : row.reference?.type === "PRODUCTION"
        ? `${row.reference.production?.serieId ?? ""}-${row.reference.production?.correlative ?? ""}`
        : `${row.serie?.code ?? ""}-${row.correlative ?? ""}`;

    if (q) {
      const haystack = normalizeText([document, thirdParty, row.direction, row.createdBy?.email, row.postedBy?.email].filter(Boolean).join(" "));
      if (!haystack.includes(q)) return false;
    }

    if (directionRule?.values?.length && !directionRule.values.includes(row.direction)) return false;
    if (!matchText(document, documentRule)) return false;
    if (!matchText(thirdParty, thirdPartyRule)) return false;

    return true;
  });
}
