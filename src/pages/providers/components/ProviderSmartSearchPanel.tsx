import {
  SmartSearchPanel,
  type DataTableRecentSearchItem,
  type DataTableSavedSearchItem,
} from "@/components/table/search";
import type {
  ProviderSearchRule,
  ProviderSearchSnapshot,
  ProviderSearchStateResponse,
} from "@/pages/providers/types/supplier";
import {
  findProviderSearchRule,
  getProviderSearchRuleSummary,
  getProviderSearchSelectionCount,
  type ProviderSearchFilterKey,
  type ProviderSmartSearchColumn,
} from "@/pages/providers/utils/providerSmartSearch";

type Props = {
  recent?: DataTableRecentSearchItem<ProviderSearchSnapshot>[];
  saved?: DataTableSavedSearchItem<ProviderSearchSnapshot>[];
  columns: ProviderSmartSearchColumn[];
  snapshot: ProviderSearchSnapshot;
  searchState?: ProviderSearchStateResponse | null;
  filterQuery?: string;
  onApplySnapshot: (snapshot: ProviderSearchSnapshot) => void;
  onApplyRule: (rule: ProviderSearchRule) => void;
  onRemoveRule: (fieldId: ProviderSearchFilterKey) => void;
  onDeleteMetric?: (metricId: string) => void;
};

export function ProviderSmartSearchPanel({
  recent = [],
  saved = [],
  columns,
  snapshot,
  searchState,
  filterQuery,
  onApplySnapshot,
  onApplyRule,
  onRemoveRule,
  onDeleteMetric,
}: Props) {
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
      getRule={findProviderSearchRule}
      getRuleSummary={(currentSnapshot, fieldId) =>
        getProviderSearchRuleSummary(currentSnapshot, fieldId, searchState)
      }
      getSelectionCount={getProviderSearchSelectionCount}
      fieldsSectionTitle="Columnas"
      fieldsSectionDescription="Filtra proveedores por identidad, contacto, estado o tiempo de espera."
      initialVisibleFields={6}
      filterQuery={filterQuery}
    />
  );
}
