import { SmartSearchPanel, type DataTableRecentSearchItem } from "@/components/table/search";
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
  columns: ProductSmartSearchColumn[];
  snapshot: ProductSearchSnapshot;
  filterQuery?: string;
  onApplySnapshot: (snapshot: ProductSearchSnapshot) => void;
  onApplyRule: (rule: ProductSearchRule) => void;
  onRemoveRule: (fieldId: ProductSearchFilterKey) => void;
};

export function ProductSmartSearchPanel({
  recent = [],
  columns,
  snapshot,
  filterQuery,
  onApplySnapshot,
  onApplyRule,
  onRemoveRule,
}: Props) {
  return (
    <SmartSearchPanel
      recent={recent}
      fields={columns}
      snapshot={snapshot}
      onApplySnapshot={onApplySnapshot}
      onApplyRule={onApplyRule}
      onRemoveRule={onRemoveRule}
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
