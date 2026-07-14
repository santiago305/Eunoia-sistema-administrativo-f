import { SmartSearchPanel, type DataTableRecentSearchItem, type DataTableSavedSearchItem } from "@/shared/components/table/search";
import type { AgencySearchRule, AgencySearchSnapshot, AgencySearchStateResponse } from "@/features/agencies/types/agencySearch";
import {
  buildAgencySmartSearchColumns,
  findAgencySearchRule,
  getAgencySearchRuleSummary,
  getAgencySearchSelectionCount,
  type AgencySearchFilterKey,
} from "@/features/agencies/utils/agencySmartSearch";

type Props = {
  recent?: DataTableRecentSearchItem<AgencySearchSnapshot>[];
  saved?: DataTableSavedSearchItem<AgencySearchSnapshot>[];
  snapshot: AgencySearchSnapshot;
  catalogs?: AgencySearchStateResponse["catalogs"] | null;
  filterQuery?: string;
  onApplySnapshot: (snapshot: AgencySearchSnapshot) => void;
  onApplyRule: (rule: AgencySearchRule) => void;
  onRemoveRule: (fieldId: "q" | AgencySearchFilterKey) => void;
  onDeleteMetric?: (metricId: string) => void;
};

export function AgencySmartSearchPanel({
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
  const columns = buildAgencySmartSearchColumns(catalogs ?? undefined);

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
      getRule={findAgencySearchRule}
      getRuleSummary={(currentSnapshot, fieldId) =>
        getAgencySearchRuleSummary(currentSnapshot, fieldId, catalogs)
      }
      getSelectionCount={getAgencySearchSelectionCount}
      fieldsSectionTitle="Filtros"
      fieldsSectionDescription="Filtra agencias por nombre, alias de sucursal, ubigeo o direccion."
      initialVisibleFields={3}
      filterQuery={filterQuery}
    />
  );
}
