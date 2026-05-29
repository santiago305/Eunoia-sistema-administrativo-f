import { SmartSearchPanel, type DataTableRecentSearchItem, type DataTableSavedSearchItem } from "@/shared/components/table/search";
import type { SourceSearchRule, SourceSearchSnapshot, SourceSearchStateResponse } from "@/features/sources/types/sourceSearch";
import {
  buildSourceSmartSearchColumns,
  findSourceSearchRule,
  getSourceSearchRuleSummary,
  getSourceSearchSelectionCount,
  type SourceSearchFilterKey,
} from "@/features/sources/utils/sourceSmartSearch";

type Props = {
  recent?: DataTableRecentSearchItem<SourceSearchSnapshot>[];
  saved?: DataTableSavedSearchItem<SourceSearchSnapshot>[];
  snapshot: SourceSearchSnapshot;
  catalogs?: SourceSearchStateResponse["catalogs"] | null;
  filterQuery?: string;
  onApplySnapshot: (snapshot: SourceSearchSnapshot) => void;
  onApplyRule: (rule: SourceSearchRule) => void;
  onRemoveRule: (fieldId: "q" | SourceSearchFilterKey) => void;
  onDeleteMetric?: (metricId: string) => void;
};

export function SourceSmartSearchPanel({
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
  const columns = buildSourceSmartSearchColumns(catalogs ?? undefined);

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
      getRule={findSourceSearchRule}
      getRuleSummary={(currentSnapshot, fieldId) => getSourceSearchRuleSummary(currentSnapshot, fieldId, catalogs)}
      getSelectionCount={getSourceSearchSelectionCount}
      fieldsSectionTitle="Filtros"
      fieldsSectionDescription="Filtra enganches por estado, nombre o detalle."
      initialVisibleFields={3}
      filterQuery={filterQuery}
    />
  );
}

