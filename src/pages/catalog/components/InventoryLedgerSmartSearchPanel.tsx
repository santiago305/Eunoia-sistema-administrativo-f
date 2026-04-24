import {
  SmartSearchPanel,
  type DataTableRecentSearchItem,
  type DataTableSavedSearchItem,
} from "@/components/table/search";
import type {
  InventoryLedgerSearchSnapshot,
  InventoryLedgerSearchStateResponse,
  InventoryLedgerSearchRule,
} from "@/pages/catalog/types/inventoryLedgerSearch";
import type {
  InventoryLedgerSearchFilterKey,
  InventoryLedgerSmartSearchColumn,
} from "@/pages/catalog/utils/inventoryLedgerSmartSearch";
import {
  findInventoryLedgerSearchRule,
  getInventoryLedgerSearchRuleSummary,
  getInventoryLedgerSearchSelectionCount,
} from "@/pages/catalog/utils/inventoryLedgerSmartSearch";

type Props = {
  recent?: DataTableRecentSearchItem<InventoryLedgerSearchSnapshot>[];
  saved?: DataTableSavedSearchItem<InventoryLedgerSearchSnapshot>[];
  columns: InventoryLedgerSmartSearchColumn[];
  snapshot: InventoryLedgerSearchSnapshot;
  searchState?: InventoryLedgerSearchStateResponse | null;
  filterQuery?: string;
  onApplySnapshot: (snapshot: InventoryLedgerSearchSnapshot) => void;
  onApplyRule: (rule: InventoryLedgerSearchRule) => void;
  onRemoveRule: (fieldId: InventoryLedgerSearchFilterKey) => void;
  onDeleteMetric?: (metricId: string) => void;
};

export function InventoryLedgerSmartSearchPanel({
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
      getRule={findInventoryLedgerSearchRule}
      getRuleSummary={(currentSnapshot, fieldId) =>
        getInventoryLedgerSearchRuleSummary(currentSnapshot, fieldId, searchState)
      }
      getSelectionCount={getInventoryLedgerSearchSelectionCount}
      fieldsSectionTitle="Columnas"
      fieldsSectionDescription="Filtra por SKU, almacén, usuario y entrada/salida."
      initialVisibleFields={4}
      filterQuery={filterQuery}
    />
  );
}

