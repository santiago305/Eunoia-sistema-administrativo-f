import {
  SmartSearchPanel,
  type DataTableRecentSearchItem,
  type DataTableSavedSearchItem,
} from "@/shared/components/table/search";
import type {
  PaymentAccountSearchRule,
  PaymentAccountSearchSnapshot,
  PaymentAccountSearchStateResponse,
} from "../types/payment-account-search.types";
import {
  findPaymentAccountSearchRule,
  getPaymentAccountSearchRuleSummary,
  getPaymentAccountSearchSelectionCount,
  type PaymentAccountSearchFilterKey,
  type PaymentAccountSmartSearchColumn,
} from "../utils/paymentAccountSmartSearch";

type Props = {
  recent?: DataTableRecentSearchItem<PaymentAccountSearchSnapshot>[];
  saved?: DataTableSavedSearchItem<PaymentAccountSearchSnapshot>[];
  columns: PaymentAccountSmartSearchColumn[];
  snapshot: PaymentAccountSearchSnapshot;
  searchState?: PaymentAccountSearchStateResponse | null;
  filterQuery?: string;
  onApplySnapshot: (snapshot: PaymentAccountSearchSnapshot) => void;
  onApplyRule: (rule: PaymentAccountSearchRule) => void;
  onRemoveRule: (fieldId: PaymentAccountSearchFilterKey) => void;
  onDeleteMetric?: (metricId: string) => void;
};

export function PaymentAccountSmartSearchPanel({
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
      getRule={findPaymentAccountSearchRule}
      getRuleSummary={(currentSnapshot, fieldId) =>
        getPaymentAccountSearchRuleSummary(currentSnapshot, fieldId, searchState)
      }
      getSelectionCount={getPaymentAccountSearchSelectionCount}
      fieldsSectionTitle="Filtros"
      fieldsSectionDescription="Combina tipo, estado, moneda y cuenta predeterminada."
      initialVisibleFields={4}
      filterQuery={filterQuery}
    />
  );
}
