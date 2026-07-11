import { SmartSearchPanel } from "@/shared/components/table/search";
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
  catalogs?: RecurringPurchaseSearchCatalogs | null;
  filterQuery?: string;
  onApplySnapshot: (snapshot: RecurringPurchaseSearchSnapshot) => void;
  onApplyRule: (rule: RecurringPurchaseSearchRule) => void;
  onRemoveRule: (fieldId: RecurringPurchaseSearchFilterKey) => void;
};

export function RecurringPurchaseSmartSearchPanel({
  columns,
  snapshot,
  catalogs,
  filterQuery,
  onApplySnapshot,
  onApplyRule,
  onRemoveRule,
}: Props) {
  return (
    <SmartSearchPanel
      fields={columns}
      snapshot={snapshot}
      onApplySnapshot={onApplySnapshot}
      onApplyRule={onApplyRule}
      onRemoveRule={onRemoveRule}
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
