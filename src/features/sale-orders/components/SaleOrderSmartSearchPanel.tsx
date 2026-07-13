import { SmartSearchPanel, type DataTableRecentSearchItem, type DataTableSavedSearchItem } from "@/shared/components/table/search";
import type { SaleOrderSearchRule, SaleOrderSearchSnapshot, SaleOrderSearchStateResponse } from "@/features/sale-orders/types/saleOrder";
import {
  findSaleOrderSearchRule,
  getSaleOrderSearchRuleSummary,
  getSaleOrderSearchSelectionCount,
  type SaleOrderSearchFilterKey,
  type SaleOrderSmartSearchColumn,
} from "@/features/sale-orders/utils/saleOrderSmartSearch";

type Props = {
  recent?: DataTableRecentSearchItem<SaleOrderSearchSnapshot>[];
  saved?: DataTableSavedSearchItem<SaleOrderSearchSnapshot>[];
  columns: SaleOrderSmartSearchColumn[];
  snapshot: SaleOrderSearchSnapshot;
  searchState?: SaleOrderSearchStateResponse | null;
  filterQuery?: string;
  onApplySnapshot: (snapshot: SaleOrderSearchSnapshot) => void;
  onApplyRule: (rule: SaleOrderSearchRule) => void;
  onRemoveRule: (fieldId: SaleOrderSearchFilterKey) => void;
  onDeleteMetric?: (metricId: string) => void;
};

export function SaleOrderSmartSearchPanel({
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
      getRule={findSaleOrderSearchRule}
      getRuleSummary={(currentSnapshot, fieldId) => getSaleOrderSearchRuleSummary(currentSnapshot, fieldId, searchState)}
      getSelectionCount={getSaleOrderSearchSelectionCount}
      fieldsSectionTitle="Filtros"
      fieldsSectionDescription="Filtra pedidos por estado de pago o fechas de agenda/entrega."
      initialVisibleFields={4}
      filterQuery={filterQuery}
    />
  );
}

