import {
  SmartSearchPanel,
  type DataTableRecentSearchItem,
  type DataTableSavedSearchItem,
} from "@/components/table/search";
import type {
  ProductSearchFilterKey,
  ProductSearchRule,
  ProductSearchSnapshot,
  ProductSmartSearchColumn,
} from "@/pages/catalog/utils/productSmartSearch";
import {
  findProductSearchRule,
  getProductSearchRuleSummary,
  getProductSearchSelectionCount,
} from "@/pages/catalog/utils/productSmartSearch";

type Props = {
  recent?: DataTableRecentSearchItem<ProductSearchSnapshot>[];
  saved?: DataTableSavedSearchItem<ProductSearchSnapshot>[];
  columns: ProductSmartSearchColumn[];
  snapshot: ProductSearchSnapshot;
  filterQuery?: string;
  onApplySnapshot: (snapshot: ProductSearchSnapshot) => void;
  onApplyRule: (rule: ProductSearchRule) => void;
  onRemoveRule: (fieldId: ProductSearchFilterKey) => void;
  onDeleteMetric?: (metricId: string) => void;
};

export function ProductSmartSearchPanel({
  recent = [],
  saved = [],
  columns,
  snapshot,
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
      getRule={findProductSearchRule}
      getRuleSummary={getProductSearchRuleSummary}
      getSelectionCount={getProductSearchSelectionCount}
      fieldsSectionTitle="Columnas"
      fieldsSectionDescription="Filtra por nombre, marca, estado, variantes y stock."
      initialVisibleFields={6}
      filterQuery={filterQuery}
    />
  );
}
