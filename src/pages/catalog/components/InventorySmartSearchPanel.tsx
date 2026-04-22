import {
  SmartSearchPanel,
  type DataTableRecentSearchItem,
  type DataTableSavedSearchItem,
} from "@/components/table/search";
import type {
  InventorySearchCatalogs,
  InventorySearchFilterKey,
  InventorySearchRule,
  InventorySearchSnapshot,
  InventorySmartSearchColumn,
} from "@/pages/catalog/utils/inventorySmartSearch";
import {
  findInventorySearchRule,
  getInventorySearchRuleSummary,
  getInventorySearchSelectionCount,
} from "@/pages/catalog/utils/inventorySmartSearch";

type Props = {
  recent?: DataTableRecentSearchItem<InventorySearchSnapshot>[];
  saved?: DataTableSavedSearchItem<InventorySearchSnapshot>[];
  columns: InventorySmartSearchColumn[];
  snapshot: InventorySearchSnapshot;
  catalogs?: InventorySearchCatalogs | null;
  filterQuery?: string;
  onApplySnapshot: (snapshot: InventorySearchSnapshot) => void;
  onApplyRule: (rule: InventorySearchRule) => void;
  onRemoveRule: (fieldId: InventorySearchFilterKey) => void;
  onDeleteMetric?: (metricId: string) => void;
};

export function InventorySmartSearchPanel({
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
      getRule={findInventorySearchRule}
      getRuleSummary={(currentSnapshot, fieldId) =>
        getInventorySearchRuleSummary(currentSnapshot, fieldId, catalogs)
      }
      getSelectionCount={getInventorySearchSelectionCount}
      fieldsSectionTitle="Columnas"
      fieldsSectionDescription="Filtra inventario por almacén."
      initialVisibleFields={4}
      filterQuery={filterQuery}
    />
  );
}

