import {
  SmartSearchPanel,
  type DataTableRecentSearchItem,
  type DataTableSavedSearchItem,
} from "@/shared/components/table/search";
import type {
  PaymentSearchRule,
  PaymentSearchSnapshot,
  PaymentSearchStateResponse,
} from "../types/payment-search.types";
import {
  findPaymentSearchRule,
  getPaymentSearchRuleSummary,
  getPaymentSearchSelectionCount,
  type PaymentSearchFilterKey,
  type PaymentSmartSearchColumn,
} from "../utils/paymentSmartSearch";

type Props = {
  recent?: DataTableRecentSearchItem<PaymentSearchSnapshot>[];
  saved?: DataTableSavedSearchItem<PaymentSearchSnapshot>[];
  columns: PaymentSmartSearchColumn[];
  snapshot: PaymentSearchSnapshot;
  searchState?: PaymentSearchStateResponse | null;
  filterQuery?: string;
  onApplySnapshot: (snapshot: PaymentSearchSnapshot) => void;
  onApplyRule: (rule: PaymentSearchRule) => void;
  onRemoveRule: (fieldId: PaymentSearchFilterKey) => void;
  onDeleteMetric?: (metricId: string) => void;
};

export function PaymentSmartSearchPanel({
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
      getRule={findPaymentSearchRule}
      getRuleSummary={(currentSnapshot, fieldId) =>
        getPaymentSearchRuleSummary(currentSnapshot, fieldId, searchState)
      }
      getSelectionCount={getPaymentSearchSelectionCount}
      fieldsSectionTitle="Filtros"
      fieldsSectionDescription="Combina estado, fechas, monto, metodo, cuenta y evidencia."
      initialVisibleFields={4}
      filterQuery={filterQuery}
    />
  );
}
