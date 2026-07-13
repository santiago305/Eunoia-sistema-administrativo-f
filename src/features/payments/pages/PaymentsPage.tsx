import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CalendarClock, Plus } from "lucide-react";
import {
  DataTableSearchBar,
  DataTableSearchChips,
  type DataTableRecentSearchItem,
  type DataTableSavedSearchItem,
} from "@/shared/components/table/search";
import { PageActionsRow } from "@/shared/components/components/PageActionsRow";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { PageShell } from "@/shared/layouts/PageShell";
import { errorResponse, successResponse } from "@/shared/common/utils/response";
import { useFeedbackToast } from "@/shared/hooks/useFeedbackToast";
import { usePermissions } from "@/shared/hooks/usePermissions";
import {
  approvePayment,
  deletePaymentSearchMetric,
  getPaymentSearchState,
  listPayments,
  rejectPayment,
  removePayment,
  savePaymentSearchMetric,
  type ListPaymentsResponse,
} from "@/shared/services/paymentService";
import { PaymentKpiStrip } from "../components/PaymentKpiStrip";
import { PaymentsTable } from "../components/PaymentsTable";
import { PaymentSmartSearchPanel } from "../components/PaymentSmartSearchPanel";
import type {
  PaymentSearchRule,
  PaymentSearchSnapshot,
  PaymentSearchStateResponse,
} from "../types/payment-search.types";
import type { PaymentRecord } from "../types/payment.types";
import {
  buildPaymentSearchChips,
  buildPaymentSmartSearchColumns,
  createEmptyPaymentSearchFilters,
  hasPaymentSearchCriteria,
  removePaymentSearchKey,
  sanitizePaymentSearchSnapshot,
  upsertPaymentSearchRule,
  type PaymentSearchFilterKey,
} from "../utils/paymentSmartSearch";

const DEFAULT_LIMIT = 20;

export default function PaymentsPage() {
  const { can } = usePermissions();
  const { showFeedback } = useFeedbackToast();
  const showFeedbackRef = useRef(showFeedback);

  useEffect(() => {
    showFeedbackRef.current = showFeedback;
  }, [showFeedback]);

  const canReadPayments = can("payments.read");
  const canCreatePayment = can("payments.create");
  const canSchedulePayment = can("payments.schedule");
  const canApprovePayment = can("payments.approve");
  const canRejectPayment = can("payments.reject");
  const canDeletePayment = can("payments.delete");
  const canViewEvidence = can("payments.view_evidence");
  const canAttachEvidence = can("payments.attach_evidence");

  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingMetric, setSavingMetric] = useState(false);
  const [busyPaymentId, setBusyPaymentId] = useState<string | null>(null);
  const [searchState, setSearchState] = useState<PaymentSearchStateResponse | null>(null);
  const [pagination, setPagination] = useState<Pick<ListPaymentsResponse, "total" | "page" | "limit">>({
    total: 0,
    page: 1,
    limit: DEFAULT_LIMIT,
  });
  const [searchText, setSearchText] = useState("");
  const [appliedSearchText, setAppliedSearchText] = useState("");
  const [searchFilters, setSearchFilters] = useState(() => createEmptyPaymentSearchFilters());

  const draftSnapshot = useMemo(
    () => sanitizePaymentSearchSnapshot({ q: searchText, filters: searchFilters }),
    [searchFilters, searchText],
  );

  const executedSnapshot = useMemo(
    () => sanitizePaymentSearchSnapshot({ q: appliedSearchText, filters: searchFilters }),
    [appliedSearchText, searchFilters],
  );

  const loadSearchState = useCallback(async () => {
    if (!canReadPayments) return;

    try {
      const response = await getPaymentSearchState();
      setSearchState(response);
    } catch {
      showFeedbackRef.current(errorResponse("No se pudo cargar el buscador inteligente de pagos."));
    }
  }, [canReadPayments]);

  const loadPayments = useCallback(async () => {
    if (!canReadPayments) {
      setPayments([]);
      setPagination({ total: 0, page: 1, limit: pagination.limit });
      return;
    }

    setLoading(true);
    try {
      const data = await listPayments({
        page: pagination.page,
        limit: pagination.limit,
        q: executedSnapshot.q,
        filters: executedSnapshot.filters.length ? executedSnapshot.filters : undefined,
      });
      setPayments(Array.isArray(data?.items) ? data.items : []);
      setPagination({
        total: data?.total ?? 0,
        page: data?.page ?? 1,
        limit: data?.limit ?? DEFAULT_LIMIT,
      });

      if (hasPaymentSearchCriteria(executedSnapshot)) {
        void loadSearchState();
      }
    } catch {
      setPayments([]);
      setPagination((prev) => ({ ...prev, total: 0 }));
      showFeedbackRef.current(errorResponse("No se pudo cargar la lista de pagos."));
    } finally {
      setLoading(false);
    }
  }, [canReadPayments, executedSnapshot, loadSearchState, pagination.limit, pagination.page]);

  useEffect(() => {
    void loadSearchState();
  }, [loadSearchState]);

  useEffect(() => {
    void loadPayments();
  }, [loadPayments]);

  const submitSearch = useCallback(() => {
    startTransition(() => {
      setAppliedSearchText(searchText.trim());
      setPagination((prev) => ({ ...prev, page: 1 }));
    });
  }, [searchText]);

  const applySmartSnapshot = useCallback((snapshot: PaymentSearchSnapshot) => {
    const normalized = sanitizePaymentSearchSnapshot(snapshot);
    startTransition(() => {
      setSearchText(normalized.q ?? "");
      setAppliedSearchText(normalized.q ?? "");
      setSearchFilters(normalized.filters);
      setPagination((prev) => ({ ...prev, page: 1 }));
    });
  }, []);

  const handleApplySearchRule = useCallback((rule: PaymentSearchRule) => {
    startTransition(() => {
      setSearchFilters((current) => {
        const next = upsertPaymentSearchRule(
          sanitizePaymentSearchSnapshot({ q: searchText, filters: current }),
          rule,
        );
        return next.filters;
      });
      setPagination((prev) => ({ ...prev, page: 1 }));
    });
  }, [searchText]);

  const handleRemoveSearchRule = useCallback((fieldId: PaymentSearchFilterKey) => {
    startTransition(() => {
      setSearchFilters((current) => {
        const next = removePaymentSearchKey(
          sanitizePaymentSearchSnapshot({ q: searchText, filters: current }),
          fieldId,
        );
        return next.filters;
      });
      setPagination((prev) => ({ ...prev, page: 1 }));
    });
  }, [searchText]);

  const handleRemoveChip = useCallback((key: "q" | PaymentSearchFilterKey) => {
    const nextSnapshot = removePaymentSearchKey(
      sanitizePaymentSearchSnapshot({ q: appliedSearchText, filters: searchFilters }),
      key,
    );
    startTransition(() => {
      setSearchText(nextSnapshot.q ?? "");
      setAppliedSearchText(nextSnapshot.q ?? "");
      setSearchFilters(nextSnapshot.filters);
      setPagination((prev) => ({ ...prev, page: 1 }));
    });
  }, [appliedSearchText, searchFilters]);

  const handleSaveMetric = useCallback(async (name: string) => {
    const snapshot = sanitizePaymentSearchSnapshot({
      q: appliedSearchText,
      filters: searchFilters,
    });
    if (!hasPaymentSearchCriteria(snapshot)) return false;

    setSavingMetric(true);
    try {
      const response = await savePaymentSearchMetric(name, snapshot);
      if (response.type === "success") {
        showFeedback(successResponse(response.message));
        await loadSearchState();
        return true;
      }
      showFeedback(errorResponse(response.message));
      return false;
    } catch {
      showFeedback(errorResponse("No se pudo guardar la metrica de pagos."));
      return false;
    } finally {
      setSavingMetric(false);
    }
  }, [appliedSearchText, loadSearchState, searchFilters, showFeedback]);

  const handleDeleteMetric = useCallback(async (metricId: string) => {
    try {
      const response = await deletePaymentSearchMetric(metricId);
      if (response.type === "success") {
        showFeedback(successResponse(response.message));
        await loadSearchState();
        return;
      }
      showFeedback(errorResponse(response.message));
    } catch {
      showFeedback(errorResponse("No se pudo eliminar la metrica de pagos."));
    }
  }, [loadSearchState, showFeedback]);

  const handleApprove = useCallback(async (payment: PaymentRecord) => {
    if (!canApprovePayment || !payment.payDocId || busyPaymentId) return;
    setBusyPaymentId(payment.payDocId);
    try {
      const response = await approvePayment(payment.payDocId);
      if (response.type === "success") {
        showFeedback(successResponse(response.message));
        await loadPayments();
        return;
      }
      showFeedback(errorResponse(response.message));
    } catch {
      showFeedback(errorResponse("No se pudo aprobar el pago."));
    } finally {
      setBusyPaymentId(null);
    }
  }, [busyPaymentId, canApprovePayment, loadPayments, showFeedback]);

  const handleReject = useCallback(async (payment: PaymentRecord) => {
    if (!canRejectPayment || !payment.payDocId || busyPaymentId) return;
    setBusyPaymentId(payment.payDocId);
    try {
      const response = await rejectPayment(payment.payDocId, undefined);
      if (response.type === "success") {
        showFeedback(successResponse(response.message));
        await loadPayments();
        return;
      }
      showFeedback(errorResponse(response.message));
    } catch {
      showFeedback(errorResponse("No se pudo rechazar el pago."));
    } finally {
      setBusyPaymentId(null);
    }
  }, [busyPaymentId, canRejectPayment, loadPayments, showFeedback]);

  const handleDelete = useCallback(async (payment: PaymentRecord) => {
    if (!canDeletePayment || !payment.payDocId || busyPaymentId) return;
    setBusyPaymentId(payment.payDocId);
    try {
      await removePayment(payment.payDocId);
      showFeedback(successResponse("Pago eliminado correctamente."));
      await loadPayments();
    } catch {
      showFeedback(errorResponse("No se pudo eliminar el pago."));
    } finally {
      setBusyPaymentId(null);
    }
  }, [busyPaymentId, canDeletePayment, loadPayments, showFeedback]);

  const smartSearchColumns = useMemo(
    () => buildPaymentSmartSearchColumns(searchState),
    [searchState],
  );

  const recentSearches = useMemo<DataTableRecentSearchItem<PaymentSearchSnapshot>[]>(
    () =>
      (searchState?.recent ?? []).map((item) => ({
        id: item.recentId,
        label: item.label,
        snapshot: item.snapshot,
      })),
    [searchState],
  );

  const savedMetrics = useMemo<DataTableSavedSearchItem<PaymentSearchSnapshot>[]>(
    () =>
      (searchState?.saved ?? []).map((metric) => ({
        id: metric.metricId,
        name: metric.name,
        label: metric.label,
        snapshot: metric.snapshot,
      })),
    [searchState],
  );

  const searchChips = useMemo(
    () => buildPaymentSearchChips(executedSnapshot, searchState),
    [executedSnapshot, searchState],
  );

  const toolbarSearchContent = (
    <DataTableSearchBar
      value={searchText}
      onChange={(value) => startTransition(() => setSearchText(value))}
      onSubmitSearch={submitSearch}
      searchLabel="Busca pagos"
      searchName="payments-smart-search"
      canSaveMetric={hasPaymentSearchCriteria(executedSnapshot)}
      saveLoading={savingMetric}
      onSaveMetric={handleSaveMetric}
    >
      <PaymentSmartSearchPanel
        recent={recentSearches}
        saved={savedMetrics}
        columns={smartSearchColumns}
        snapshot={draftSnapshot}
        searchState={searchState}
        filterQuery={searchText}
        onApplySnapshot={applySmartSnapshot}
        onApplyRule={handleApplySearchRule}
        onRemoveRule={handleRemoveSearchRule}
        onDeleteMetric={handleDeleteMetric}
      />
    </DataTableSearchBar>
  );

  return (
    <PageShell>
      <PageActionsRow>
        {canCreatePayment ? (
          <SystemButton size="sm" leftIcon={<Plus className="h-4 w-4" />} disabled>
            Crear pago
          </SystemButton>
        ) : null}
        {canSchedulePayment ? (
          <SystemButton size="sm" variant="secondary" leftIcon={<CalendarClock className="h-4 w-4" />} disabled>
            Programar
          </SystemButton>
        ) : null}
      </PageActionsRow>

      <PaymentKpiStrip payments={payments} />

      <DataTableSearchChips
        chips={searchChips}
        onRemove={(chip) => handleRemoveChip(chip.removeKey)}
      />

      <PaymentsTable
        payments={payments}
        loading={loading}
        pagination={pagination}
        toolbarSearchContent={toolbarSearchContent}
        canApprovePayment={canApprovePayment}
        canRejectPayment={canRejectPayment}
        canDeletePayment={canDeletePayment}
        canViewEvidence={canViewEvidence}
        canAttachEvidence={canAttachEvidence}
        busyPaymentId={busyPaymentId}
        onPageChange={(nextPage) => setPagination((prev) => ({ ...prev, page: nextPage }))}
        onApprove={handleApprove}
        onReject={handleReject}
        onDelete={handleDelete}
      />
    </PageShell>
  );
}
