import { SmartSearchPanel, type DataTableRecentSearchItem, type DataTableSavedSearchItem } from "@/shared/components/table/search";
import type { PackSearchRule, PackSearchSnapshot, PackSearchStateResponse } from "@/features/catalog/types/packSearch";
import {
  findPackSearchRule,
  getPackSearchRuleSummary,
  getPackSearchSelectionCount,
  buildPackSmartSearchColumns,
  type PackSearchFilterKey,
} from "@/features/catalog/utils/packSmartSearch";

type Props = {
  recent?: DataTableRecentSearchItem<PackSearchSnapshot>[];
  saved?: DataTableSavedSearchItem<PackSearchSnapshot>[];
  snapshot: PackSearchSnapshot;
  catalogs?: PackSearchStateResponse["catalogs"] | null;
  filterQuery?: string;
  onApplySnapshot: (snapshot: PackSearchSnapshot) => void;
  onApplyRule: (rule: PackSearchRule) => void;
  onRemoveRule: (fieldId: "q" | PackSearchFilterKey) => void;
  onDeleteMetric?: (metricId: string) => void;
};

export function PackSmartSearchPanel({
  recent = [],
  saved = [],
  snapshot,
  catalogs,
  filterQuery,
  onApplySnapshot,
  onApplyRule,
  onRemoveRule,
  onDeleteMetric,
}: Props) {
  const columns = buildPackSmartSearchColumns(catalogs ?? undefined);

  return (
    <SmartSearchPanel
      recent={recent}
      saved={saved}
      fields={columns}
      snapshot={snapshot}
      onApplySnapshot={onApplySnapshot}
      onApplyRule={onApplyRule}
      onRemoveRule={onRemoveRule}
      onDeleteMetric={onDeleteMetric}
      getRule={findPackSearchRule}
      getRuleSummary={(currentSnapshot, fieldId) => getPackSearchRuleSummary(currentSnapshot, fieldId, catalogs)}
      getSelectionCount={getPackSearchSelectionCount}
      fieldsSectionTitle="Filtros"
      fieldsSectionDescription="Filtra packs por estado, descripción o total."
      initialVisibleFields={3}
      filterQuery={filterQuery}
    />
  );
}
