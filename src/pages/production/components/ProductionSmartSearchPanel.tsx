import {
  SmartSearchPanel,
  type DataTableRecentSearchItem,
  type DataTableSavedSearchItem,
} from "@/components/table/search";
import type {
  ProductionSearchRule,
  ProductionSearchSnapshot,
  ProductionSearchStateResponse,
} from "@/pages/production/types/production";
import {
  findProductionSearchRule,
  getProductionSearchRuleSummary,
  getProductionSearchSelectionCount,
  type ProductionSearchFilterKey,
  type ProductionSmartSearchColumn,
} from "@/pages/production/utils/productionSmartSearch";

type Props = {
  recent?: DataTableRecentSearchItem<ProductionSearchSnapshot>[];
  saved?: DataTableSavedSearchItem<ProductionSearchSnapshot>[];
  columns: ProductionSmartSearchColumn[];
  snapshot: ProductionSearchSnapshot;
  searchState?: ProductionSearchStateResponse | null;
  filterQuery?: string;
  onApplySnapshot: (snapshot: ProductionSearchSnapshot) => void;
  onApplyRule: (rule: ProductionSearchRule) => void;
  onRemoveRule: (fieldId: ProductionSearchFilterKey) => void;
  onDeleteMetric?: (metricId: string) => void;
};

export function ProductionSmartSearchPanel({
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
      getRule={findProductionSearchRule}
      getRuleSummary={(currentSnapshot, fieldId) =>
        getProductionSearchRuleSummary(currentSnapshot, fieldId, searchState)
      }
      getSelectionCount={getProductionSearchSelectionCount}
      fieldsSectionTitle="Columnas"
      fieldsSectionDescription="Filtra producciones por serie o correlativo, referencia, fecha, almacenes, estado o SKU."
      initialVisibleFields={4}
      filterQuery={filterQuery}
    />
  );
}
