import { startTransition, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  DataTableSearchBar,
  DataTableSearchChips,
} from "@/shared/components/table/search";
import { PageActionsRow } from "@/shared/components/components/PageActionsRow";
import { PageShell } from "@/shared/layouts/PageShell";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { usePermissions } from "@/shared/hooks/usePermissions";
import { useFeedbackToast } from "@/shared/hooks/useFeedbackToast";
import { errorResponse, successResponse } from "@/shared/common/utils/response";
import {
  listAccountPayables,
  markOverdueAccountPayables,
} from "@/shared/services/accountsPayableService";
import { AccountPayableKpiStrip } from "../components/AccountPayableKpiStrip";
import { AccountPayableSmartSearchPanel } from "../components/AccountPayableSmartSearchPanel";
import { AccountsPayableTable } from "../components/AccountsPayableTable";
import { PaymentFormModal, type PaymentFormInitialPayment } from "../components/PaymentFormModal";
import type {
  AccountPayableSearchRule,
  AccountPayableSearchSnapshot,
  AccountPayableSearchStateResponse,
} from "../types/account-payable-search.types";
import type {
  AccountPayable,
  ListAccountPayablesResponse,
} from "../types/payable.types";
import {
  AccountPayableSearchFields,
  AccountPayableSearchOperators,
} from "../types/account-payable-search.types";
import {
  ACCOUNT_PAYABLE_CURRENCY_OPTIONS,
  ACCOUNT_PAYABLE_STATUS_OPTIONS,
  buildAccountPayableListQuery,
  buildAccountPayableSearchChips,
  buildAccountPayableSmartSearchColumns,
  createEmptyAccountPayableSearchFilters,
  hasAccountPayableSearchCriteria,
  removeAccountPayableSearchKey,
  sanitizeAccountPayableSearchSnapshot,
  upsertAccountPayableSearchRule,
  type AccountPayableSearchFilterKey,
} from "../utils/accountPayableSmartSearch";

const DEFAULT_LIMIT = 20;

const SEARCH_STATE: AccountPayableSearchStateResponse = {
  recent: [],
  saved: [],
  catalogs: {
    statuses: ACCOUNT_PAYABLE_STATUS_OPTIONS,
    currencies: ACCOUNT_PAYABLE_CURRENCY_OPTIONS,
  },
};

const buildInitialFilters = (purchaseId: string) => {
  if (!purchaseId.trim()) return createEmptyAccountPayableSearchFilters();

  return sanitizeAccountPayableSearchSnapshot({
    filters: [
      {
        field: AccountPayableSearchFields.PURCHASE_ID,
        operator: AccountPayableSearchOperators.EQ,
        value: purchaseId,
      },
    ],
  }).filters;
};

const toInitialPayment = (payable: AccountPayable): PaymentFormInitialPayment => ({
  poId: payable.purchaseId,
  quotaId: payable.quotaId ?? undefined,
  accountPayableId: payable.accountPayableId,
  currency: payable.currency,
  amount: payable.amountPending,
});

export default function AccountsPayablePage() {
  const { can } = usePermissions();
  const { showFeedback } = useFeedbackToast();
  const [searchParams] = useSearchParams();
  const canManage = can("accounts-payable.manage");
  const canMarkOverdue = can("accounts-payable.mark_overdue");

  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<AccountPayable[]>([]);
  const [searchText, setSearchText] = useState("");
  const [appliedSearchText, setAppliedSearchText] = useState("");
  const [searchFilters, setSearchFilters] = useState(() => buildInitialFilters(searchParams.get("purchaseId") ?? ""));
  const [paymentFormMode, setPaymentFormMode] = useState<"create" | "schedule" | null>(null);
  const [selected, setSelected] = useState<AccountPayable | null>(null);
  const [pagination, setPagination] = useState<Pick<ListAccountPayablesResponse, "total" | "page" | "limit">>({
    total: 0,
    page: 1,
    limit: DEFAULT_LIMIT,
  });

  const draftSnapshot = useMemo(
    () => sanitizeAccountPayableSearchSnapshot({ q: searchText, filters: searchFilters }),
    [searchFilters, searchText],
  );

  const executedSnapshot = useMemo(
    () => sanitizeAccountPayableSearchSnapshot({ q: appliedSearchText, filters: searchFilters }),
    [appliedSearchText, searchFilters],
  );

  const loadPayables = useCallback(async () => {
    setLoading(true);
    try {
      const query = buildAccountPayableListQuery(executedSnapshot);
      const data = await listAccountPayables({
        page: pagination.page,
        limit: pagination.limit,
        ...query,
      });
      setItems(Array.isArray(data.items) ? data.items : []);
      setPagination({
        total: data.total ?? 0,
        page: data.page ?? 1,
        limit: data.limit ?? DEFAULT_LIMIT,
      });
    } catch {
      setItems([]);
      showFeedback(errorResponse("No se pudo cargar cuentas por pagar."));
    } finally {
      setLoading(false);
    }
  }, [executedSnapshot, pagination.limit, pagination.page, showFeedback]);

  useEffect(() => {
    void loadPayables();
  }, [loadPayables]);

  const handleMarkOverdue = async () => {
    if (!canMarkOverdue) return;
    try {
      const result = await markOverdueAccountPayables();
      showFeedback(successResponse(`Cuentas vencidas actualizadas: ${result.updated}`));
      await loadPayables();
    } catch {
      showFeedback(errorResponse("No se pudo marcar cuentas vencidas."));
    }
  };

  const submitSearch = useCallback(() => {
    startTransition(() => {
      setAppliedSearchText(searchText.trim());
      setPagination((prev) => ({ ...prev, page: 1 }));
    });
  }, [searchText]);

  const applySmartSnapshot = useCallback((snapshot: AccountPayableSearchSnapshot) => {
    const normalized = sanitizeAccountPayableSearchSnapshot(snapshot);
    startTransition(() => {
      setSearchText(normalized.q ?? "");
      setAppliedSearchText(normalized.q ?? "");
      setSearchFilters(normalized.filters);
      setPagination((prev) => ({ ...prev, page: 1 }));
    });
  }, []);

  const handleApplySearchRule = useCallback((rule: AccountPayableSearchRule) => {
    startTransition(() => {
      setSearchFilters((current) => {
        const next = upsertAccountPayableSearchRule(
          sanitizeAccountPayableSearchSnapshot({ q: searchText, filters: current }),
          rule,
        );
        return next.filters;
      });
      setPagination((prev) => ({ ...prev, page: 1 }));
    });
  }, [searchText]);

  const handleRemoveSearchRule = useCallback((fieldId: AccountPayableSearchFilterKey) => {
    startTransition(() => {
      setSearchFilters((current) => {
        const next = removeAccountPayableSearchKey(
          sanitizeAccountPayableSearchSnapshot({ q: searchText, filters: current }),
          fieldId,
        );
        return next.filters;
      });
      setPagination((prev) => ({ ...prev, page: 1 }));
    });
  }, [searchText]);

  const handleRemoveChip = useCallback((key: "q" | AccountPayableSearchFilterKey) => {
    const nextSnapshot = removeAccountPayableSearchKey(executedSnapshot, key);
    startTransition(() => {
      setSearchText(nextSnapshot.q ?? "");
      setAppliedSearchText(nextSnapshot.q ?? "");
      setSearchFilters(nextSnapshot.filters);
      setPagination((prev) => ({ ...prev, page: 1 }));
    });
  }, [executedSnapshot]);

  const openPaymentForm = useCallback((payable: AccountPayable, mode: "create" | "schedule") => {
    setSelected(payable);
    setPaymentFormMode(mode);
  }, []);

  const smartSearchColumns = useMemo(
    () => buildAccountPayableSmartSearchColumns(SEARCH_STATE),
    [],
  );

  const searchChips = useMemo(
    () => buildAccountPayableSearchChips(executedSnapshot, SEARCH_STATE),
    [executedSnapshot],
  );

  const toolbarSearchContent = (
    <DataTableSearchBar
      value={searchText}
      onChange={(value) => startTransition(() => setSearchText(value))}
      onSubmitSearch={submitSearch}
      searchLabel="Busca cuentas por pagar"
      searchName="accounts-payable-smart-search"
      canSaveMetric={hasAccountPayableSearchCriteria(executedSnapshot)}
    >
      <AccountPayableSmartSearchPanel
        recent={[]}
        saved={[]}
        columns={smartSearchColumns}
        snapshot={draftSnapshot}
        searchState={SEARCH_STATE}
        filterQuery={searchText}
        onApplySnapshot={applySmartSnapshot}
        onApplyRule={handleApplySearchRule}
        onRemoveRule={handleRemoveSearchRule}
      />
    </DataTableSearchBar>
  );

  return (
    <PageShell>
      <PageActionsRow>
        {canMarkOverdue ? (
          <SystemButton size="sm" variant="outline" onClick={() => void handleMarkOverdue()}>
            Marcar vencidas
          </SystemButton>
        ) : null}
      </PageActionsRow>

      <AccountPayableKpiStrip payables={items} />

      <DataTableSearchChips
        chips={searchChips}
        onRemove={(chip) => handleRemoveChip(chip.removeKey)}
      />

      <AccountsPayableTable
        items={items}
        loading={loading}
        page={pagination.page}
        limit={pagination.limit}
        total={pagination.total}
        canManage={canManage}
        toolbarSearchContent={toolbarSearchContent}
        onPageChange={(nextPage) => setPagination((prev) => ({ ...prev, page: nextPage }))}
        onRegisterPayment={(payable) => openPaymentForm(payable, "create")}
        onSchedulePayment={(payable) => openPaymentForm(payable, "schedule")}
      />

      <PaymentFormModal
        open={Boolean(selected && paymentFormMode)}
        mode={paymentFormMode ?? "create"}
        initialPayment={selected ? toInitialPayment(selected) : null}
        onClose={() => {
          setSelected(null);
          setPaymentFormMode(null);
        }}
        onSaved={() => void loadPayables()}
      />
    </PageShell>
  );
}

