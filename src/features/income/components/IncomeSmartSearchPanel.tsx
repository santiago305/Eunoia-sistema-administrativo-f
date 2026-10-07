import { SmartSearchPanel, type DataTableRecentSearchItem, type DataTableSavedSearchItem } from "@/shared/components/table/search";
import type { IncomeSearchCatalogs, IncomeSearchField, IncomeSearchRule, IncomeSearchSnapshot } from "../types/income.types";
import { buildIncomeSmartSearchColumns, incomeRuleSummary } from "../utils/incomeSmartSearch";

export type { IncomeSearchSnapshot } from "../types/income.types";

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
      getRuleSummary={(current, fieldId) => incomeRuleSummary(current, fieldId, catalogs)}
      getSelectionCount={(current, fieldId) =>
        current.filters.find((item) => item.field === fieldId)?.values?.length ?? 0
      }
      fieldsSectionTitle="Filtros"
      fieldsSectionDescription="Selecciona filtros para ingresos."
      initialVisibleFields={7}
    />
  );
}
