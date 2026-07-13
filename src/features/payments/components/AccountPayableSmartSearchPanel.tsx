import {
  SmartSearchPanel,
  type DataTableRecentSearchItem,
  type DataTableSavedSearchItem,
} from "@/shared/components/table/search";
import type {
  AccountPayableSearchRule,
  AccountPayableSearchSnapshot,
  AccountPayableSearchStateResponse,
} from "../types/account-payable-search.types";
import {
  findAccountPayableSearchRule,
  getAccountPayableSearchRuleSummary,
  getAccountPayableSearchSelectionCount,
  type AccountPayableSearchFilterKey,
  type AccountPayableSmartSearchColumn,
} from "../utils/accountPayableSmartSearch";

type Props = {
  recent?: DataTableRecentSearchItem<AccountPayableSearchSnapshot>[];
  saved?: DataTableSavedSearchItem<AccountPayableSearchSnapshot>[];
  columns: AccountPayableSmartSearchColumn[];
  snapshot: AccountPayableSearchSnapshot;
  searchState?: AccountPayableSearchStateResponse | null;
  filterQuery?: string;
  onApplySnapshot: (snapshot: AccountPayableSearchSnapshot) => void;
  onApplyRule: (rule: AccountPayableSearchRule) => void;
  onRemoveRule: (fieldId: AccountPayableSearchFilterKey) => void;
  onDeleteMetric?: (metricId: string) => void;
};

export function AccountPayableSmartSearchPanel({
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
      getRule={findAccountPayableSearchRule}
      getRuleSummary={(currentSnapshot, fieldId) =>
        getAccountPayableSearchRuleSummary(currentSnapshot, fieldId, searchState)
      }
      getSelectionCount={getAccountPayableSearchSelectionCount}
      fieldsSectionTitle="Filtros"
      fieldsSectionDescription="Combina estado, compra, proveedor, moneda, saldo y vencimiento."
      initialVisibleFields={4}
      filterQuery={filterQuery}
    />
  );
}
