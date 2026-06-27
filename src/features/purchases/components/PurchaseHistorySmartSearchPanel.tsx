import {
  SmartSearchPanel,
  type DataTableRecentSearchItem,
  type DataTableSavedSearchItem,
} from "@/shared/components/table/search";
import type {
  PurchaseSearchRule,
  PurchaseSearchSnapshot,
  PurchaseSearchStateResponse,
} from "../types/purchase";
import {
  findPurchaseHistorySearchRule,
  getPurchaseHistorySearchRuleSummary,
  getPurchaseHistorySearchSelectionCount,
  type PurchaseHistorySearchFilterKey,
  type PurchaseHistorySmartSearchColumn,
} from "../utils/purchaseHistorySmartSearch";

type Props = {
  recent?: DataTableRecentSearchItem<PurchaseSearchSnapshot>[];
  saved?: DataTableSavedSearchItem<PurchaseSearchSnapshot>[];
  columns: PurchaseHistorySmartSearchColumn[];
  snapshot: PurchaseSearchSnapshot;
  searchState?: PurchaseSearchStateResponse | null;
  filterQuery?: string;
  onApplySnapshot: (snapshot: PurchaseSearchSnapshot) => void;
  onApplyRule: (rule: PurchaseSearchRule) => void;
  onRemoveRule: (fieldId: PurchaseHistorySearchFilterKey) => void;
  onDeleteMetric?: (metricId: string) => void;
};

export function PurchaseHistorySmartSearchPanel({
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
      getRule={findPurchaseHistorySearchRule}
      getRuleSummary={(currentSnapshot, fieldId) =>
        getPurchaseHistorySearchRuleSummary(currentSnapshot, fieldId, searchState)
      }
      getSelectionCount={getPurchaseHistorySearchSelectionCount}
      fieldsSectionTitle="Columnas del historial"
      fieldsSectionDescription="Filtra por compra, proveedor, estado, evento, usuario y resumen de eventos."
      initialVisibleFields={4}
      filterQuery={filterQuery}
    />
  );
}