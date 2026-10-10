import type { SmartSearchFieldConfig, SmartSearchOperatorOption, DataTableSearchChip } from "@/shared/components/table/search";
import type { IncomeSearchCatalogs, IncomeSearchField, IncomeSearchOperator, IncomeSearchRule, IncomeSearchSnapshot } from "../types/income.types";

type IncomeSmartSearchColumn = SmartSearchFieldConfig<IncomeSearchField, IncomeSearchOperator> & { key: IncomeSearchField };

const CATALOG_OPERATORS: SmartSearchOperatorOption<IncomeSearchOperator>[] = [
  { id: "in", label: "Es" },
];
const TEXT_OPERATORS: SmartSearchOperatorOption<IncomeSearchOperator>[] = [
  { id: "contains", label: "Contiene", inputMode: "text" },
  { id: "eq", label: "Es", inputMode: "text" },
];

export function buildIncomeSmartSearchColumns(catalogs: IncomeSearchCatalogs = {}): IncomeSmartSearchColumn[] {
  return [
    {
      key: "status",
      id: "status",
      label: "Estado",
      kind: "catalog",
      options: [
        { id: "PENDING_CONFIRMATION", label: "Por confirmar" },
        { id: "POSTED", label: "Contabilizado" },
        { id: "CANCELLED", label: "Cancelado" },
        { id: "REVERSED", label: "Revertido" },
      ],
      operators: CATALOG_OPERATORS,
    },
    {
      key: "paymentMethodId",
      id: "paymentMethodId",
      label: "Método de pago",
      kind: "catalog",
      options: catalogs.methods ?? [],
      operators: CATALOG_OPERATORS,
    },
    {
      key: "detail",
      id: "detail",
      label: "Detalle",
      kind: "text",
      operators: TEXT_OPERATORS,
      placeholder: "Ej. anticipo",
    },
    {
      key: "companyPaymentAccountId",
      id: "companyPaymentAccountId",
      label: "Cuenta de pago",
      kind: "catalog",
      options: [{ id: "__unassigned__", label: "Sin cuenta asignada" }, ...(catalogs.accounts ?? [])],
      operators: CATALOG_OPERATORS,
    },
    {
      key: "hasEvidence",
      id: "hasEvidence",
      label: "Evidencia",
      kind: "catalog",
      options: [
        { id: "true", label: "Con evidencia" },
        { id: "false", label: "Sin evidencia" },
      ],
      operators: CATALOG_OPERATORS,
    },
  ];
}

export const normalizeIncomeSnapshot = (snapshot: Partial<IncomeSearchSnapshot> = {}): IncomeSearchSnapshot => {
  const filters = (snapshot.filters ?? []).filter((rule) => rule?.field && (rule.values?.length || rule.value?.trim()));
  return {
    q: snapshot.q?.trim() ?? "",
    filters: filters.map((rule) => ({
      ...rule,
      mode: rule.mode ?? "include",
      values: rule.values?.filter(Boolean),
      value: rule.value?.trim(),
    })),
  };
};

export const upsertIncomeRule = (snapshot: IncomeSearchSnapshot, rule: IncomeSearchRule): IncomeSearchSnapshot => {
  const next = snapshot.filters.filter((current) => current.field !== rule.field);
  const values = [...new Set(rule.values?.filter(Boolean) ?? [])];
  if (!values.length && !rule.value?.trim()) return { ...snapshot, filters: next };

  const normalizedRule = { ...rule, mode: rule.mode ?? "include", ...(values.length ? { values } : {}), ...(rule.value ? { value: rule.value.trim() } : {}) };
  if ((rule.field === "status" || rule.field === "hasEvidence") && values.length > 1) {
    return { ...snapshot, filters: next };
  }
  return { ...snapshot, filters: [...next, normalizedRule] };
};

export const removeIncomeRule = (snapshot: IncomeSearchSnapshot, field: IncomeSearchField): IncomeSearchSnapshot => ({
  ...snapshot,
  filters: snapshot.filters.filter((rule) => rule.field !== field),
});

const optionLabel = (options: Array<{ id: string; label: string }>, id: string) => options.find((option) => option.id === id)?.label ?? id;

export const buildIncomeSearchChips = (snapshot: IncomeSearchSnapshot, catalogs: IncomeSearchCatalogs = {}): DataTableSearchChip<IncomeSearchField>[] => {
  const chips: DataTableSearchChip<IncomeSearchField>[] = [];
  if (snapshot.q) chips.push({ id: "q", label: `Ingreso: ${snapshot.q}`, removeKey: "q" });
  const options = buildIncomeSmartSearchColumns(catalogs);
  snapshot.filters.forEach((rule) => {
    const field = options.find((item) => item.id === rule.field);
    const values = rule.values?.length ? rule.values : rule.value ? [rule.value] : [];
    const labels = values.map((value) => optionLabel(field?.options ?? [], value));
    const summary = rule.field === "detail" ? `${rule.operator === "eq" ? "Es" : "Contiene"}: ${rule.value}` : labels.join(", ");
    if (summary) chips.push({ id: rule.field, label: `${field?.label ?? rule.field}: ${summary}`, removeKey: rule.field });
  });
  return chips;
};

export const incomeRuleSummary = (snapshot: IncomeSearchSnapshot, fieldId: IncomeSearchField, catalogs: IncomeSearchCatalogs = {}) => {
  const rule = snapshot.filters.find((item) => item.field === fieldId);
  if (!rule) return null;
  const values = rule.values?.length ? rule.values : rule.value ? [rule.value] : [];
  const field = buildIncomeSmartSearchColumns(catalogs).find((item) => item.id === fieldId);
  return fieldId === "detail" ? `${rule.operator === "eq" ? "Es" : "Contiene"}: ${rule.value}` : values.map((value) => optionLabel(field?.options ?? [], value)).join(", ");
};
