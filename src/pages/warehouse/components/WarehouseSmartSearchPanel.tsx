import {
  SmartSearchPanel,
  type DataTableRecentSearchItem,
  type DataTableSavedSearchItem,
} from "@/components/table/search";
import type {
  WarehouseSearchCatalogs,
  WarehouseSearchRule,
  WarehouseSearchSnapshot,
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
  catalogs?: WarehouseSearchCatalogs | null;
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
  catalogs,
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
        getWarehouseSearchRuleSummary(currentSnapshot, fieldId, catalogs)
      }
      getSelectionCount={getWarehouseSearchSelectionCount}
      fieldsSectionTitle="Columnas"
      fieldsSectionDescription="Filtra almacenes por ubicacion, nombre, direccion o estado."
      initialVisibleFields={4}
      filterQuery={filterQuery}
    />
  );
}
