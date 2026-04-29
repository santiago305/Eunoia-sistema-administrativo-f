import {
  SmartSearchPanel,
  type DataTableRecentSearchItem,
  type DataTableSavedSearchItem,
} from "@/shared/components/table/search";
import type {
  InventorySearchCatalogs,
  InventorySearchFilterKey,
  InventorySearchLabels,
  InventorySearchRule,
  InventorySearchSnapshot,
  InventorySmartSearchColumn,
} from "@/features/catalog/utils/inventorySmartSearch";
import {
  findInventorySearchRule,
  getInventorySearchRuleSummary,
  getInventorySearchSelectionCount,
} from "@/features/catalog/utils/inventorySmartSearch";

type Props = {
  recent?: DataTableRecentSearchItem<InventorySearchSnapshot>[];
  saved?: DataTableSavedSearchItem<InventorySearchSnapshot>[];
  columns: InventorySmartSearchColumn[];
  snapshot: InventorySearchSnapshot;
  catalogs?: InventorySearchCatalogs | null;
  labels?: InventorySearchLabels;
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
  labels,
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
      fieldsSectionDescription={`Filtra inventario por ${labels?.item?.toLowerCase() ?? "producto"}, almacen y stock.`}
      initialVisibleFields={4}
      filterQuery={filterQuery}
    />
  );
}
