import {
  SmartSearchPanel,
  type DataTableRecentSearchItem,
  type DataTableSavedSearchItem,
} from "@/shared/components/table/search";
import type {
  InventoryDocumentsSearchStateResponse,
  InventoryDocumentsSearchSnapshot,
  InventoryDocumentsSearchRule,
} from "@/features/catalog/types/inventoryDocumentsSearch";
import type {
  InventoryDocumentsSearchFilterKey,
  InventoryDocumentsSmartSearchColumn,
} from "@/features/catalog/utils/inventoryDocumentsSmartSearch";
import {
  findInventoryDocumentsSearchRule,
  getInventoryDocumentsSearchRuleSummary,
  getInventoryDocumentsSearchSelectionCount,
} from "@/features/catalog/utils/inventoryDocumentsSmartSearch";

type Props = {
  recent?: DataTableRecentSearchItem<InventoryDocumentsSearchSnapshot>[];
  saved?: DataTableSavedSearchItem<InventoryDocumentsSearchSnapshot>[];
  columns: InventoryDocumentsSmartSearchColumn[];
  snapshot: InventoryDocumentsSearchSnapshot;
  searchState?: InventoryDocumentsSearchStateResponse | null;
  filterQuery?: string;
  onApplySnapshot: (snapshot: InventoryDocumentsSearchSnapshot) => void;
  onApplyRule: (rule: InventoryDocumentsSearchRule) => void;
  onRemoveRule: (fieldId: InventoryDocumentsSearchFilterKey) => void;
  onDeleteMetric?: (metricId: string) => void;
};

export function InventoryDocumentsSmartSearchPanel({
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
      getRule={findInventoryDocumentsSearchRule}
      getRuleSummary={(currentSnapshot, fieldId) =>
        getInventoryDocumentsSearchRuleSummary(currentSnapshot, fieldId, searchState)
      }
      getSelectionCount={getInventoryDocumentsSearchSelectionCount}
      fieldsSectionTitle="Columnas"
      fieldsSectionDescription="Filtra por almacén y estado del documento."
      initialVisibleFields={4}
      filterQuery={filterQuery}
    />
  );
}

