import { SmartSearchPanel, type DataTableRecentSearchItem } from "@/shared/components/table/search";
import type {
  LedgerSearchFilterKey,
  LedgerSearchRule,
  LedgerSearchSnapshot,
  LedgerSmartSearchColumn,
} from "@/features/catalog/utils/ledgerSmartSearch";
import {
  findLedgerSearchRule,
  getLedgerSearchRuleSummary,
  getLedgerSearchSelectionCount,
} from "@/features/catalog/utils/ledgerSmartSearch";

type Props = {
  recent?: DataTableRecentSearchItem<LedgerSearchSnapshot>[];
  columns: LedgerSmartSearchColumn[];
  snapshot: LedgerSearchSnapshot;
  filterQuery?: string;
  onApplySnapshot: (snapshot: LedgerSearchSnapshot) => void;
  onApplyRule: (rule: LedgerSearchRule) => void;
  onRemoveRule: (fieldId: LedgerSearchFilterKey) => void;
};

export function LedgerSmartSearchPanel({
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
      getRule={findLedgerSearchRule}
      getRuleSummary={getLedgerSearchRuleSummary}
      getSelectionCount={getLedgerSearchSelectionCount}
      fieldsSectionTitle="Columnas"
      fieldsSectionDescription="Filtra documento, tipo y tercero dentro del kardex visible."
      initialVisibleFields={3}
      filterQuery={filterQuery}
    />
  );
}
