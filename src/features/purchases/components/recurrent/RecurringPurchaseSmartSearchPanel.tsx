import { SmartSearchPanel, type DataTableRecentSearchItem, type DataTableSavedSearchItem } from "@/shared/components/table/search";
import type {
  RecurringPurchaseSearchCatalogs,
  RecurringPurchaseSearchRule,
  RecurringPurchaseSearchSnapshot,
} from "../../types/recurring-purchase.types";
import {
  findRecurringPurchaseSearchRule,
  getRecurringPurchaseSearchRuleSummary,
  getRecurringPurchaseSearchSelectionCount,
  type RecurringPurchaseSearchFilterKey,
  type RecurringPurchaseSmartSearchColumn,
} from "../../utils/recurringPurchaseSmartSearch";

type Props = {
  columns: RecurringPurchaseSmartSearchColumn[];
  snapshot: RecurringPurchaseSearchSnapshot;
  recent?: DataTableRecentSearchItem<RecurringPurchaseSearchSnapshot>[];
  saved?: DataTableSavedSearchItem<RecurringPurchaseSearchSnapshot>[];
  catalogs?: RecurringPurchaseSearchCatalogs | null;
  filterQuery?: string;
  onApplySnapshot: (snapshot: RecurringPurchaseSearchSnapshot) => void;
  onApplyRule: (rule: RecurringPurchaseSearchRule) => void;
  onRemoveRule: (fieldId: RecurringPurchaseSearchFilterKey) => void;
  onDeleteMetric?: (metricId: string) => void;
};

export function RecurringPurchaseSmartSearchPanel({
  columns,
  snapshot,
  recent,
  saved,
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
      getRule={findRecurringPurchaseSearchRule}
      getRuleSummary={(currentSnapshot, fieldId) =>
        getRecurringPurchaseSearchRuleSummary(currentSnapshot, fieldId, catalogs)
      }
      getSelectionCount={getRecurringPurchaseSearchSelectionCount}
      fieldsSectionTitle="Filtros"
      fieldsSectionDescription="Filtra recurrentes por vencimiento, proveedor, estado, monto o pago."
      initialVisibleFields={5}
      filterQuery={filterQuery}
    />
  );
}
