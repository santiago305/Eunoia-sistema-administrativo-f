import { SmartSearchPanel, type DataTableRecentSearchItem, type DataTableSavedSearchItem } from "@/shared/components/table/search";
import type { IncomeSearchCatalogs, IncomeSearchField, IncomeSearchRule } from "../types/income.types";
import { buildIncomeSmartSearchColumns } from "../utils/incomeSmartSearch";

export type IncomeSearchSnapshot = {
  q?: string;
  filters: IncomeSearchRule[];
};

type Props = {
  snapshot: IncomeSearchSnapshot;
  catalogs?: IncomeSearchCatalogs;
  recent?: DataTableRecentSearchItem<IncomeSearchSnapshot>[];
  saved?: DataTableSavedSearchItem<IncomeSearchSnapshot>[];
  onApplySnapshot: (snapshot: IncomeSearchSnapshot) => void;
  onApplyRule: (rule: IncomeSearchRule) => void;
  onRemoveRule: (fieldId: IncomeSearchField) => void;
};

export function IncomeSmartSearchPanel({
  snapshot,
  catalogs,
  recent = [],
  saved = [],
  onApplySnapshot,
  onApplyRule,
  onRemoveRule,
}: Props) {
  return (
    <SmartSearchPanel
      fields={buildIncomeSmartSearchColumns(catalogs)}
      recent={recent}
      saved={saved}
      snapshot={snapshot}
      onApplySnapshot={onApplySnapshot}
      onApplyRule={onApplyRule}
      onRemoveRule={onRemoveRule}
      getRule={(current, fieldId) => current.filters.find((rule) => rule.field === fieldId) ?? null}
      getRuleSummary={(current, fieldId) => {
        const rule = current.filters.find((item) => item.field === fieldId);
        return rule?.value ?? rule?.values?.join(", ") ?? null;
      }}
      getSelectionCount={(current, fieldId) =>
        current.filters.find((item) => item.field === fieldId)?.values?.length ?? 0
      }
      fieldsSectionTitle="Filtros"
      fieldsSectionDescription="Selecciona filtros para ingresos."
      initialVisibleFields={7}
    />
  );
}
