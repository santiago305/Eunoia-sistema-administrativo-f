import { SmartSearchPanel, type DataTableRecentSearchItem, type DataTableSavedSearchItem } from "@/shared/components/table/search";
import type {
  ClientSearchCatalogs,
  ClientSearchRule,
  ClientSearchSnapshot,
} from "@/features/clients/types/clientSearch";
import {
  findClientSearchRule,
  getClientSearchRuleSummary,
  getClientSearchSelectionCount,
  buildClientSmartSearchColumns,
  type ClientSearchFilterKey,
  type ClientSmartSearchColumn,
} from "@/features/clients/utils/clientSmartSearch";

type Props = {
  recent?: DataTableRecentSearchItem<ClientSearchSnapshot>[];
  saved?: DataTableSavedSearchItem<ClientSearchSnapshot>[];
  snapshot: ClientSearchSnapshot;
  catalogs?: ClientSearchCatalogs | null;
  filterQuery?: string;
  onApplySnapshot: (snapshot: ClientSearchSnapshot) => void;
  onApplyRule: (rule: ClientSearchRule) => void;
  onRemoveRule: (fieldId: "q" | ClientSearchFilterKey) => void;
  onDeleteMetric?: (metricId: string) => void;
};

export function ClientSmartSearchPanel({
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
  const columns: ClientSmartSearchColumn[] = buildClientSmartSearchColumns(catalogs);

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
      getRule={findClientSearchRule}
      getRuleSummary={(currentSnapshot, fieldId) => getClientSearchRuleSummary(currentSnapshot, fieldId, catalogs)}
      getSelectionCount={getClientSearchSelectionCount}
      fieldsSectionTitle="Filtros"
      fieldsSectionDescription="Filtra clientes por identidad, ubicación o estado."
      initialVisibleFields={4}
      filterQuery={filterQuery}
    />
  );
}
