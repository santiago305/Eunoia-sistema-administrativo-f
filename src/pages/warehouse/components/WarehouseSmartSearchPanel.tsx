import {
  SmartSearchPanel,
  type DataTableRecentSearchItem,
  type DataTableSavedSearchItem,
} from "@/components/table/search";
import type {
  WarehouseSearchRule,
  WarehouseSearchSnapshot,
  WarehouseSearchStateResponse,
} from "@/pages/warehouse/types/warehouse";
import {
  findWarehouseSearchRule,
  getWarehouseSearchRuleSummary,
  getWarehouseSearchSelectionCount,
  type WarehouseSearchFilterKey,
  type WarehouseSmartSearchColumn,
} from "@/pages/warehouse/utils/warehouseSmartSearch";

type Props = {
  recent?: DataTableRecentSearchItem<WarehouseSearchSnapshot>[];
  saved?: DataTableSavedSearchItem<WarehouseSearchSnapshot>[];
  columns: WarehouseSmartSearchColumn[];
  snapshot: WarehouseSearchSnapshot;
  searchState?: WarehouseSearchStateResponse | null;
  filterQuery?: string;
  onApplySnapshot: (snapshot: WarehouseSearchSnapshot) => void;
  onApplyRule: (rule: WarehouseSearchRule) => void;
  onRemoveRule: (fieldId: WarehouseSearchFilterKey) => void;
  onDeleteMetric?: (metricId: string) => void;
};

export function WarehouseSmartSearchPanel({
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
      getRule={findWarehouseSearchRule}
      getRuleSummary={(currentSnapshot, fieldId) =>
        getWarehouseSearchRuleSummary(currentSnapshot, fieldId, searchState)
      }
      getSelectionCount={getWarehouseSearchSelectionCount}
      fieldsSectionTitle="Columnas"
      fieldsSectionDescription="Filtra almacenes por ubicacion, estado o fecha de creacion."
      initialVisibleFields={6}
      filterQuery={filterQuery}
    />
  );
}
