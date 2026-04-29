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
  findPurchaseSearchRule,
  getPurchaseSearchRuleSummary,
  getPurchaseSearchSelectionCount,
  type PurchaseSearchFilterKey,
  type PurchaseSmartSearchColumn,
} from "../utils/purchaseSmartSearch";

type Props = {
  recent?: DataTableRecentSearchItem<PurchaseSearchSnapshot>[];
  saved?: DataTableSavedSearchItem<PurchaseSearchSnapshot>[];
  columns: PurchaseSmartSearchColumn[];
  snapshot: PurchaseSearchSnapshot;
  searchState?: PurchaseSearchStateResponse | null;
  filterQuery?: string;
  onApplySnapshot: (snapshot: PurchaseSearchSnapshot) => void;
  onApplyRule: (rule: PurchaseSearchRule) => void;
  onRemoveRule: (fieldId: PurchaseSearchFilterKey) => void;
  onDeleteMetric?: (metricId: string) => void;
};

export function PurchaseSmartSearchPanel({
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
      getRule={findPurchaseSearchRule}
      getRuleSummary={(currentSnapshot, fieldId) =>
        getPurchaseSearchRuleSummary(currentSnapshot, fieldId, searchState)
      }
      getSelectionCount={getPurchaseSearchSelectionCount}
      fieldsSectionTitle="Columnas"
      fieldsSectionDescription="Usa cualquier columna de la tabla salvo fechas de auditoria."
      initialVisibleFields={4}
      filterQuery={filterQuery}
    />
  );
}
