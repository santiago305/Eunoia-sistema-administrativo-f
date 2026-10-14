import { useCallback, useEffect, useMemo, useState } from "react";
import { PageShell } from "@/shared/layouts/PageShell";
import {
  deleteIncomeSearchMetric,
  exportIncomeExcel,
  getIncomeSearchState,
  getIncomeSummary,
  listIncome,
  saveIncomeSearchMetric,
} from "@/shared/services/incomeService";
import type {
  Income,
  IncomeListQuery,
  IncomeSearchCatalogs,
  IncomeSearchSnapshot,
  IncomeSearchStateResponse,
  IncomeSummary,
} from "./types/income.types";
import { IncomeKpiStrip } from "./components/IncomeKpiStrip";
import { IncomeTable } from "./components/IncomeTable";
import { IncomeSmartSearchPanel } from "./components/IncomeSmartSearchPanel";
import { VoidIncomeModal } from "./components/VoidIncomeModal";
import { cancelPendingIncome, correctPostedIncome, getIncomeBatchResult, getIncomePostingResult, postIncome, postIncomeBatch, reenterIncome, reversePostedIncome, recoverPendingIncomeTransfer, type IncomePostValidation } from "@/shared/services/incomeService";
import { usePermissions } from "@/shared/hooks/usePermissions";
import { useAuth } from "@/shared/hooks/useAuth";
import { createSaleOrdersSocket } from "@/shared/lib/socket";
import { useFeedbackToast } from "@/shared/hooks/useFeedbackToast";
import { errorResponse, successResponse } from "@/shared/common/utils/response";
import { parseDateInputValue } from "@/shared/utils/functionPurchases";
import { createIdempotencyKey } from "@/shared/utils/idempotencyKey";
import { IncomePaymentEvidenceModal } from "./components/IncomePaymentEvidenceModal";
import { IncomePostConfirmationModal } from "./components/IncomePostConfirmationModal";
import { IncomeRefundsModal } from "./components/IncomeRefundsModal";
import { IncomeReconciliationModal } from "./components/IncomeReconciliationModal";
import { BankReconciliationReportModal } from "./components/BankReconciliationReportModal";
import { IncomePendingEditModal } from "./components/IncomePendingEditModal";
import { TransferPendingIncomeModal } from "./components/TransferPendingIncomeModal";
import { CorrectPostedIncomeModal } from "./components/CorrectPostedIncomeModal";
import { SaleIncomeModal, type SaleIncomeModalValues } from "@/shared/components/payments/SaleIncomeModal";
import { useSaleOrderPaymentOptions, filterSaleOrderBankAccountOptions } from "@/features/sale-orders/components/useSaleOrderPaymentOptions";
import { getIncomeEvidence, getIncomeEvidenceContent, uploadIncomeEvidence } from "@/shared/services/incomeService";
import { DataTableSearchBar, DataTableSearchChips } from "@/shared/components/table/search";
import { buildIncomeSearchChips, normalizeIncomeSnapshot, removeIncomeRule, upsertIncomeRule } from "./utils/incomeSmartSearch";
import { ExportPopover, type ExportColumn } from "@/shared/components/components/ExportPopover";
import {
  clearPendingIncomeEvidenceUpload,
  clearPendingIncomeOperation,
  getOrCreatePendingIncomeEvidenceUpload,
  listAllPendingIncomeOperations,
  savePendingIncomeOperation,
  shouldRetainPendingIncomeEvidenceUpload,
  type PendingIncomeOperation,
} from "./services/income-operation-recovery";

const LIMA_TIME_ZONE = "America/Lima";
type IncomeBatchRecovery = { idempotencyKey: string; payments: Array<{ id: string; version: number }>; confirmExcess: boolean };
type IncomeSingleRecovery = { idempotencyKey: string; incomeId: string; version: number; confirmExcess: boolean };
type IncomeApiFailure = { hasResponse: boolean; status?: number; code?: string; message?: string | string[] };
const readIncomeApiFailure = (error: unknown): IncomeApiFailure => {
  if (!error || typeof error !== "object" || !("response" in error)) return { hasResponse: false };
  const response = (error as { response?: unknown }).response;
  if (!response || typeof response !== "object") return { hasResponse: false };
  const candidate = response as { status?: unknown; data?: unknown };
  const data = candidate.data && typeof candidate.data === "object"
    ? candidate.data as { code?: unknown; message?: unknown }
    : undefined;
  const message = typeof data?.message === "string"
    ? data.message
    : Array.isArray(data?.message) && data.message.every((item): item is string => typeof item === "string")
      ? data.message
      : undefined;
  return {
    hasResponse: true,
    status: typeof candidate.status === "number" ? candidate.status : undefined,
    code: typeof data?.code === "string" ? data.code : undefined,
    message,
  };
};
const normalizeIncomeApiError = (error: unknown): { response?: { status?: number; data?: { code?: string; message?: string | string[] } } } => {
  const failure = readIncomeApiFailure(error);
  return failure.hasResponse
    ? { response: { status: failure.status, data: { code: failure.code, message: failure.message } } }
    : {};
};
const dateKey = (date: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: LIMA_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
const currentLimaMonth = () => {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: LIMA_TIME_ZONE, year: "numeric", month: "2-digit" }).formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value ?? "2026";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const last = new Date(Date.UTC(Number(year), Number(month), 0)).toISOString().slice(0, 10);
  return { from: `${year}-${month}-01`, to: last };
};

const INCOME_EXPORT_COLUMNS: ExportColumn[] = [
  { key: "paymentDate", label: "Fecha de pago" },
  { key: "accountingDate", label: "Fecha contable" },
  { key: "saleOrderNumber", label: "Pedido" },
  { key: "clientName", label: "Cliente" },
  { key: "detail", label: "Descripción" },
  { key: "operationNumber", label: "Número de operación" },
  { key: "paymentMethod", label: "Método de cobro" },
  { key: "receiverAccount", label: "Cuenta receptora" },
  { key: "amount", label: "Importe recibido" },
  { key: "currency", label: "Moneda" },
  { key: "appliedAmount", label: "Importe aplicado" },
  { key: "customerCreditBalance", label: "Saldo a favor neto" },
  { key: "financialStatus", label: "Estado financiero" },
  { key: "reconciliationStatus", label: "Estado de conciliación" },
  { key: "reconciledAmount", label: "Importe conciliado" },
  { key: "evidence", label: "Evidencia" },
  { key: "postedAt", label: "Fecha de contabilización" },
  { key: "financialReason", label: "Motivo financiero" },
];

export default function IncomePage() {
  const [rows, setRows] = useState<Income[]>([]);
  const [summary, setSummary] = useState<IncomeSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [voidingIncome, setVoidingIncome] = useState<Income | null>(null);
  const [closingAction, setClosingAction] = useState<"cancel" | "reverse">("reverse");
  const [voiding, setVoiding] = useState(false);
  const [postingPayments, setPostingPayments] = useState<Income[]>([]);
  const [posting, setPosting] = useState(false);
  const [recoveringBatch, setRecoveringBatch] = useState(false);
  const [pendingBatchRecovery, setPendingBatchRecovery] = useState<IncomeBatchRecovery | null>(null);
  const [pendingSingleRecovery, setPendingSingleRecovery] = useState<IncomeSingleRecovery | null>(null);
  const [pendingClosureRecoveries, setPendingClosureRecoveries] = useState<PendingIncomeOperation[]>([]);
  const [pendingReentryRecoveries, setPendingReentryRecoveries] = useState<PendingIncomeOperation[]>([]);
  const [pendingTransferRecoveries, setPendingTransferRecoveries] = useState<PendingIncomeOperation[]>([]);
  const [recoveringTransfer, setRecoveringTransfer] = useState(false);
  const [pendingCorrectionRecoveries, setPendingCorrectionRecoveries] = useState<PendingIncomeOperation[]>([]);
  const [recoveringCorrection, setRecoveringCorrection] = useState(false);
  const [selectedIncomeIds, setSelectedIncomeIds] = useState<string[]>([]);
  const [range, setRange] = useState(() => currentLimaMonth());
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchState, setSearchState] = useState<IncomeSearchStateResponse | null>(null);
  const [savingMetric, setSavingMetric] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [appliedSearchText, setAppliedSearchText] = useState("");
  const [searchFilters, setSearchFilters] = useState<IncomeSearchSnapshot["filters"]>([]);
  const [evidenceIncome, setEvidenceIncome] = useState<Income | null>(null);
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);
  const [transferringIncome, setTransferringIncome] = useState<Income | null>(null);
  const [correctingIncome, setCorrectingIncome] = useState<Income | null>(null);
  const [reenteringIncome, setReenteringIncome] = useState<Income | null>(null);
  const [refundIncome, setRefundIncome] = useState<Income | null>(null);
  const [reconciliationIncome, setReconciliationIncome] = useState<Income | null>(null);
  const [reconciliationReportOpen, setReconciliationReportOpen] = useState(false);
  const [reenteredIncomeId, setReenteredIncomeId] = useState<string | null>(null);
  const [reentering, setReentering] = useState(false);
  const [reenterError, setReenterError] = useState<string | null>(null);
  const [reenterEvidenceUrl, setReenterEvidenceUrl] = useState<string | null>(null);
  const [reenterEvidenceLoading, setReenterEvidenceLoading] = useState(false);
  const { can } = usePermissions();
  const paymentOptions = useSaleOrderPaymentOptions({ enabled: Boolean(reenteringIncome) });
  const { isAuthenticated, userId } = useAuth();
  const { showFeedback } = useFeedbackToast();
  const batchRecoveryStorageKey = userId ? `eunoia:income-post-batch:${userId}` : null;
  const singleRecoveryStorageKey = userId ? `eunoia:income-post-single:${userId}` : null;

  useEffect(() => {
    if (!batchRecoveryStorageKey) return;
    try {
      const saved = sessionStorage.getItem(batchRecoveryStorageKey);
      const parsed = saved ? JSON.parse(saved) as IncomeBatchRecovery : null;
      setPendingBatchRecovery(parsed && parsed.idempotencyKey && Array.isArray(parsed.payments) ? parsed : null);
    } catch {
      setPendingBatchRecovery(null);
    }
  }, [batchRecoveryStorageKey]);

  useEffect(() => {
    if (!singleRecoveryStorageKey) return;
    try {
      const saved = sessionStorage.getItem(singleRecoveryStorageKey);
      const parsed = saved ? JSON.parse(saved) as IncomeSingleRecovery : null;
      setPendingSingleRecovery(parsed && parsed.idempotencyKey && parsed.incomeId && Number.isInteger(parsed.version) ? parsed : null);
    } catch { setPendingSingleRecovery(null); }
  }, [singleRecoveryStorageKey]);

  useEffect(() => {
    if (!userId) { setPendingClosureRecoveries([]); return; }
    setPendingClosureRecoveries(listAllPendingIncomeOperations(userId).filter((operation) =>
      operation.kind === "income.cancel" || operation.kind === "income.reverse"));
  }, [userId]);

  useEffect(() => {
    if (!userId) { setPendingReentryRecoveries([]); return; }
    setPendingReentryRecoveries(listAllPendingIncomeOperations(userId).filter((operation) => operation.kind === "income.reenter"));
  }, [userId]);

  useEffect(() => {
    if (!userId) { setPendingTransferRecoveries([]); return; }
    setPendingTransferRecoveries(listAllPendingIncomeOperations(userId).filter((operation) => operation.kind === "income.transfer"));
  }, [userId]);

  useEffect(() => {
    if (!userId) { setPendingCorrectionRecoveries([]); return; }
    setPendingCorrectionRecoveries(listAllPendingIncomeOperations(userId).filter((operation) => operation.kind === "income.correct"));
  }, [userId]);

  const persistBatchRecovery = useCallback((recovery: IncomeBatchRecovery) => {
    try { if (batchRecoveryStorageKey) sessionStorage.setItem(batchRecoveryStorageKey, JSON.stringify(recovery)); } catch { /* La clave sigue protegida mientras la pantalla permanezca abierta. */ }
    setPendingBatchRecovery(recovery);
  }, [batchRecoveryStorageKey]);

  const clearBatchRecovery = useCallback(() => {
    try { if (batchRecoveryStorageKey) sessionStorage.removeItem(batchRecoveryStorageKey); } catch { /* La operación ya fue recuperada del servidor. */ }
    setPendingBatchRecovery(null);
  }, [batchRecoveryStorageKey]);

  const persistSingleRecovery = useCallback((recovery: IncomeSingleRecovery) => {
    try { if (singleRecoveryStorageKey) sessionStorage.setItem(singleRecoveryStorageKey, JSON.stringify(recovery)); } catch { /* La clave sigue protegida mientras la pantalla permanezca abierta. */ }
    setPendingSingleRecovery(recovery);
  }, [singleRecoveryStorageKey]);

  const clearSingleRecovery = useCallback(() => {
    try { if (singleRecoveryStorageKey) sessionStorage.removeItem(singleRecoveryStorageKey); } catch { /* La operaciÃ³n ya fue recuperada del servidor. */ }
    setPendingSingleRecovery(null);
  }, [singleRecoveryStorageKey]);

  const rememberClosureRecovery = useCallback((operation: PendingIncomeOperation) => {
    savePendingIncomeOperation(operation);
    setPendingClosureRecoveries(listAllPendingIncomeOperations(operation.userId).filter((item) =>
      item.kind === "income.cancel" || item.kind === "income.reverse"));
  }, []);

  const forgetClosureRecovery = useCallback((operation: PendingIncomeOperation) => {
    clearPendingIncomeOperation(operation);
    setPendingClosureRecoveries((current) => current.filter((item) =>
      item.operationId !== operation.operationId || item.idempotencyKey !== operation.idempotencyKey));
  }, []);

  const rememberReentryRecovery = useCallback((operation: PendingIncomeOperation) => {
    savePendingIncomeOperation(operation);
    setPendingReentryRecoveries((current) => [
      ...current.filter((item) => item.operationId !== operation.operationId), operation,
    ]);
  }, []);

  const rememberTransferRecovery = useCallback((operation: PendingIncomeOperation) => {
    setPendingTransferRecoveries((current) => [
      ...current.filter((item) => item.operationId !== operation.operationId), operation,
    ]);
  }, []);

  const rememberCorrectionRecovery = useCallback((operation: PendingIncomeOperation) => {
    setPendingCorrectionRecoveries((current) => [
      ...current.filter((item) => item.operationId !== operation.operationId), operation,
    ]);
  }, []);

  const forgetCorrectionRecovery = useCallback((operation: PendingIncomeOperation) => {
    clearPendingIncomeOperation(operation);
    setPendingCorrectionRecoveries((current) => current.filter((item) =>
      item.operationId !== operation.operationId || item.idempotencyKey !== operation.idempotencyKey));
  }, []);

  const forgetReentryRecovery = useCallback((operation: PendingIncomeOperation) => {
    clearPendingIncomeOperation(operation);
    setPendingReentryRecoveries((current) => current.filter((item) =>
      item.operationId !== operation.operationId || item.idempotencyKey !== operation.idempotencyKey));
  }, []);

  const catalogs = useMemo<IncomeSearchCatalogs>(
    () => searchState?.catalogs ?? { methods: [], accounts: [] },
    [searchState],
  );

  const draftSnapshot = useMemo<IncomeSearchSnapshot>(
    () => normalizeIncomeSnapshot({ q: searchText, filters: searchFilters }),
    [searchFilters, searchText],
  );

  const executedSnapshot = useMemo<IncomeSearchSnapshot>(
    () => normalizeIncomeSnapshot({ q: appliedSearchText, filters: searchFilters }),
    [appliedSearchText, searchFilters],
  );

  const recentSearches = useMemo(
    () => (searchState?.recent ?? []).map((item) => ({
      id: item.recentId,
      label: item.label,
      snapshot: normalizeIncomeSnapshot(item.snapshot),
    })),
    [searchState],
  );

  const savedMetrics = useMemo(
    () => (searchState?.saved ?? []).map((metric) => ({
      id: metric.metricId,
      name: metric.name,
      label: metric.label,
      snapshot: normalizeIncomeSnapshot(metric.snapshot),
    })),
    [searchState],
  );

  const loadSearchState = useCallback(async () => {
    try {
      setSearchState(await getIncomeSearchState());
    } catch {
      showFeedback(errorResponse("No se pudo cargar el buscador inteligente de ingresos."));
    }
  }, [showFeedback]);

  const query = useMemo<IncomeListQuery>(() => ({
    limit: 25,
    page,
    status: "ALL",
    from: range.from,
    to: range.to,
    q: executedSnapshot.q || undefined,
    filters: executedSnapshot.filters,
  }), [executedSnapshot, page, range.from, range.to]);

  const loadIncome = useCallback(async () => {
    setLoading(true);
    setSelectedIncomeIds([]);
    try {
      const [incomeResponse, summaryResponse] = await Promise.all([
        listIncome(query),
        getIncomeSummary({ ...query, page: 1 }),
      ]);
      setRows(incomeResponse.items);
      setTotal(incomeResponse.total);
      setSummary(summaryResponse);
      if (executedSnapshot.q || executedSnapshot.filters.length) void loadSearchState();
    } catch {
      showFeedback(errorResponse("No se pudo cargar la información de ingresos."));
    } finally {
      setLoading(false);
    }
  }, [executedSnapshot, loadSearchState, query, showFeedback]);

  const recoverPendingTransfer = useCallback(async (operation: PendingIncomeOperation) => {
    if (recoveringTransfer) return;
    setRecoveringTransfer(true);
    try {
      await recoverPendingIncomeTransfer(operation.incomeId, {
        version: Number(operation.payload.version),
        targetSaleOrderId: String(operation.payload.targetSaleOrderId ?? ""),
        reason: String(operation.payload.reason ?? ""),
        idempotencyKey: operation.idempotencyKey,
      });
      clearPendingIncomeOperation(operation);
      setPendingTransferRecoveries((current) => current.filter((item) => item.operationId !== operation.operationId));
      showFeedback(successResponse("Se confirmó la transferencia del pago."));
      await loadIncome();
    } catch (caught: unknown) {
      const error = normalizeIncomeApiError(caught);
      const status = error.response?.status;
      if (status !== undefined && status >= 400 && status < 500 && status !== 408 && status !== 429) {
        clearPendingIncomeOperation(operation);
        setPendingTransferRecoveries((current) => current.filter((item) => item.operationId !== operation.operationId));
        await loadIncome();
      }
      const message = error?.response?.data?.message ?? "No se pudo confirmar la transferencia. Se conserva la misma solicitud para reintentar.";
      showFeedback(errorResponse(Array.isArray(message) ? message.join(" ") : message));
    } finally { setRecoveringTransfer(false); }
  }, [loadIncome, recoveringTransfer, showFeedback]);

  const recoverPendingCorrection = useCallback(async (operation: PendingIncomeOperation) => {
    if (recoveringCorrection) return;
    setRecoveringCorrection(true);
    try {
      await correctPostedIncome(operation.incomeId, {
        version: Number(operation.payload.version), amount: Number(operation.payload.amount),
        date: String(operation.payload.date ?? ""), paymentMethodId: String(operation.payload.paymentMethodId ?? ""),
        companyPaymentAccountId: String(operation.payload.companyPaymentAccountId ?? ""),
        operationNumber: operation.payload.operationNumber == null ? null : String(operation.payload.operationNumber),
        note: operation.payload.note == null ? null : String(operation.payload.note),
        reason: String(operation.payload.reason ?? ""), idempotencyKey: operation.idempotencyKey,
        confirmExcess: Boolean(operation.payload.confirmExcess),
      });
      forgetCorrectionRecovery(operation);
      showFeedback(successResponse("Se confirmó la corrección. El ingreso original quedó revertido y el reemplazo contabilizado."));
      await loadIncome();
    } catch (caught: unknown) {
      const error = normalizeIncomeApiError(caught);
      const status = error.response?.status;
      if (status !== undefined && status >= 400 && status < 500 && status !== 408 && status !== 429) {
        forgetCorrectionRecovery(operation);
        await loadIncome();
      }
      const message = error?.response?.data?.message ?? "No se pudo confirmar la corrección. Se conserva la misma solicitud para reintentar.";
      showFeedback(errorResponse(Array.isArray(message) ? message.join(" ") : message));
    } finally { setRecoveringCorrection(false); }
  }, [forgetCorrectionRecovery, loadIncome, recoveringCorrection, showFeedback]);

  useEffect(() => { void loadIncome(); }, [loadIncome]);

  useEffect(() => {
    if (!isAuthenticated || !userId) return;
    const socket = createSaleOrdersSocket(userId);
    const onIncomeUpdated = () => { void loadIncome(); };
    socket?.on("income.updated", onIncomeUpdated);
    return () => { socket?.off("income.updated", onIncomeUpdated); };
  }, [isAuthenticated, loadIncome, userId]);

  useEffect(() => { void loadSearchState(); }, [loadSearchState]);

  const applySnapshot = useCallback((next: Partial<IncomeSearchSnapshot>) => {
    const normalized = normalizeIncomeSnapshot(next);
    setSearchText(normalized.q);
    setAppliedSearchText(normalized.q);
    setSearchFilters(normalized.filters);
    setPage(1);
  }, []);

  const applyRule = useCallback((rule: IncomeSearchSnapshot["filters"][number]) => {
    const next = upsertIncomeRule(draftSnapshot, rule);
    setSearchFilters(next.filters);
    setPage(1);
  }, [draftSnapshot]);

  const removeCriterion = useCallback((chip: { removeKey: "q" | IncomeSearchSnapshot["filters"][number]["field"] }) => {
    if (chip.removeKey === "q") {
      setSearchText("");
      setAppliedSearchText("");
    } else {
      setSearchFilters(removeIncomeRule(draftSnapshot, chip.removeKey).filters);
    }
    setPage(1);
  }, [draftSnapshot]);

  const setStatus = useCallback((status: "PENDING_CONFIRMATION" | "POSTED" | "CANCELLED" | "REVERSED") => {
    applyRule({ field: "status", operator: "in", values: [status] });
  }, [applyRule]);

  const handleObservedFilter = useCallback(() => {
    let next = upsertIncomeRule(draftSnapshot, { field: "status", operator: "in", values: ["POSTED"] });
    next = upsertIncomeRule(next, { field: "hasEvidence", operator: "in", values: ["false"] });
    setSearchFilters(next.filters);
    setPage(1);
  }, [draftSnapshot]);

  const handleCustomerCreditFilter = useCallback(() => {
    const next = upsertIncomeRule(draftSnapshot, { field: "customerCreditStatus", operator: "in", values: ["HAS_BALANCE"] });
    setSearchFilters(next.filters);
    setPage(1);
  }, [draftSnapshot]);

  const handleExportIncome = useCallback(async (columns: ExportColumn[]) => {
    setExporting(true);
    try {
      const file = await exportIncomeExcel({
        columns,
        q: executedSnapshot.q || undefined,
        from: range.from,
        to: range.to,
        filters: executedSnapshot.filters,
      });
      const url = URL.createObjectURL(file);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `ingresos-${range.from}-${range.to}.xlsx`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      showFeedback(successResponse("El Excel de ingresos se descargó correctamente."));
    } catch {
      showFeedback(errorResponse("No se pudo exportar. Revisa el período o agrega filtros y vuelve a intentar."));
    } finally {
      setExporting(false);
    }
  }, [executedSnapshot, range.from, range.to, showFeedback]);

  const canSaveMetric = Boolean(draftSnapshot.q || draftSnapshot.filters.length);

  const handleSaveMetric = useCallback(async (name: string) => {
    if (!canSaveMetric || savingMetric) return false;

    setSavingMetric(true);
    try {
      const response = await saveIncomeSearchMetric(name, draftSnapshot);
      showFeedback(successResponse(response.message || "Metrica guardada correctamente"));
      await loadSearchState();
      return true;
    } catch {
      showFeedback(errorResponse("No se pudo guardar la metrica de ingresos."));
      return false;
    } finally {
      setSavingMetric(false);
    }
  }, [canSaveMetric, draftSnapshot, loadSearchState, savingMetric, showFeedback]);

  const handleDeleteMetric = useCallback(async (metricId: string) => {
    try {
      const response = await deleteIncomeSearchMetric(metricId);
      showFeedback(successResponse(response.message || "Metrica eliminada correctamente"));
      await loadSearchState();
    } catch {
      showFeedback(errorResponse("No se pudo eliminar la metrica de ingresos."));
    }
  }, [loadSearchState, showFeedback]);

  const changeRange = ({ startDate, endDate }: { startDate: Date | null; endDate: Date | null }) => {
    if (!startDate || !endDate) setRange(currentLimaMonth());
    else setRange({ from: dateKey(startDate), to: dateKey(endDate) });
    setPage(1);
  };

  const executeClosureRecovery = useCallback(async (operation: PendingIncomeOperation) => {
    const income = { incomeId: operation.incomeId, version: Number(operation.payload.version) };
    const reason = String(operation.payload.reason ?? "");
    if (operation.kind === "income.cancel") return cancelPendingIncome(income, reason, operation.idempotencyKey);
    if (operation.kind === "income.reverse") return reversePostedIncome(income, reason, operation.idempotencyKey);
    throw new Error("La operación de cierre pendiente no es compatible.");
  }, []);

  const executeReentryRecovery = useCallback((operation: PendingIncomeOperation) => reenterIncome(operation.incomeId, {
    reason: String(operation.payload.reason ?? ""),
    idempotencyKey: operation.idempotencyKey,
    amount: Number(operation.payload.amount),
    date: String(operation.payload.date ?? ""),
    paymentMethodId: String(operation.payload.paymentMethodId ?? ""),
    companyPaymentAccountId: String(operation.payload.companyPaymentAccountId ?? ""),
    operationNumber: operation.payload.operationNumber == null ? null : String(operation.payload.operationNumber),
    note: operation.payload.note == null ? null : String(operation.payload.note),
  }), []);

  const recoverPendingReentry = useCallback(async (operation: PendingIncomeOperation) => {
    if (reentering) return;
    setReentering(true);
    try {
      await executeReentryRecovery(operation);
      forgetReentryRecovery(operation);
      showFeedback(successResponse("Se confirmó el reingreso. El nuevo pago quedó por confirmar; si falta evidencia, adjúntala desde Editar ingreso."));
      await loadIncome();
    } catch (caught: unknown) {
      const error = normalizeIncomeApiError(caught);
      const status = error?.response?.status;
      if (status === 409) {
        forgetReentryRecovery(operation);
        await loadIncome();
      }
      const message = error?.response?.data?.message ?? "No se pudo confirmar el reingreso. Se conserva la misma solicitud para reintentar.";
      showFeedback(errorResponse(Array.isArray(message) ? message.join(" ") : message));
    } finally { setReentering(false); }
  }, [executeReentryRecovery, forgetReentryRecovery, loadIncome, reentering, showFeedback]);

  const handleVoid = useCallback(async (reason: string) => {
    if (!voidingIncome || voiding) return;
    if (pendingCorrectionRecoveries.some((operation) => operation.incomeId === voidingIncome.incomeId)) {
      showFeedback(errorResponse("Primero recupera la corrección de este ingreso antes de iniciar otra operación financiera."));
      return;
    }
    if (pendingReentryRecoveries.length) {
      showFeedback(errorResponse("Primero confirma el resultado del reingreso pendiente antes de cerrar otro ingreso."));
      return;
    }
    const kind = closingAction === "cancel" ? "income.cancel" : "income.reverse";
    const existing = pendingClosureRecoveries.find((operation) => operation.incomeId === voidingIncome.incomeId);
    if (pendingClosureRecoveries.length && !existing) {
      showFeedback(errorResponse("Primero recupera la operación de cierre pendiente antes de iniciar otra."));
      return;
    }
    if (existing && (existing.kind !== kind
      || Number(existing.payload.version) !== voidingIncome.version
      || String(existing.payload.reason) !== reason.trim())) {
      showFeedback(errorResponse("Hay una anulación de este ingreso sin resultado confirmado. Recupera la solicitud original sin cambiar motivo ni versión."));
      return;
    }
    const operation: PendingIncomeOperation = existing ?? {
      operationId: `${kind}:${voidingIncome.incomeId}`,
      userId: userId ?? "",
      incomeId: voidingIncome.incomeId,
      kind,
      idempotencyKey: createIdempotencyKey(),
      payload: { version: voidingIncome.version, reason: reason.trim() },
      createdAt: new Date().toISOString(),
    };
    if (!existing) rememberClosureRecovery(operation);
    setVoiding(true);
    try {
      const result = await executeClosureRecovery(operation);
      showFeedback(successResponse(result.message || (result.status === "CANCELLED"
        ? "Ingreso anulado correctamente."
        : "Ingreso revertido correctamente.")));
      forgetClosureRecovery(operation);
      setVoidingIncome(null);
      await loadIncome();
    } catch (caught: unknown) {
      const error = normalizeIncomeApiError(caught);
      const message = error?.response?.data?.message ?? "No se pudo anular el ingreso. Actualiza la información e inténtalo nuevamente.";
      showFeedback(errorResponse(Array.isArray(message) ? message.join(" ") : message));
      if (error?.response?.status === 409) {
        // A stale/closed-state conflict is definitive and has no committed operation to recover.
        forgetClosureRecovery(operation);
        setVoidingIncome(null);
        await loadIncome();
      }
    } finally {
      setVoiding(false);
    }
  }, [closingAction, executeClosureRecovery, forgetClosureRecovery, loadIncome, pendingClosureRecoveries, pendingCorrectionRecoveries, pendingReentryRecoveries.length, rememberClosureRecovery, showFeedback, userId, voiding, voidingIncome]);

  const recoverPendingClosure = useCallback(async (operation: PendingIncomeOperation) => {
    if (voiding) return;
    setVoiding(true);
    try {
      const result = await executeClosureRecovery(operation);
      forgetClosureRecovery(operation);
      if (voidingIncome?.incomeId === operation.incomeId) setVoidingIncome(null);
      showFeedback(successResponse(result.message || "Se recuperó el resultado de la anulación."));
      await loadIncome();
    } catch (caught: unknown) {
      const error = normalizeIncomeApiError(caught);
      const message = error?.response?.data?.message ?? "No se pudo confirmar el resultado. Se conserva la misma clave para reintentar.";
      if (error?.response?.status === 409) {
        // Committed idempotent requests replay their stored result; a replayed 409 can be discarded.
        forgetClosureRecovery(operation);
        await loadIncome();
      }
      showFeedback(errorResponse(Array.isArray(message) ? message.join(" ") : message));
    } finally {
      setVoiding(false);
    }
  }, [executeClosureRecovery, forgetClosureRecovery, loadIncome, showFeedback, voiding, voidingIncome]);

  const handlePost = useCallback(async (validation: IncomePostValidation, confirmExcess: boolean) => {
    if (!postingPayments.length || posting) return;
    if (pendingClosureRecoveries.length) {
      showFeedback(errorResponse("Hay una operación de cierre pendiente de confirmar. Recupérala antes de contabilizar otro ingreso."));
      return;
    }
    if (pendingReentryRecoveries.length) {
      showFeedback(errorResponse("Hay un reingreso pendiente de confirmar. Recupera su resultado antes de contabilizar otro ingreso."));
      return;
    }
    const isBatch = postingPayments.length > 1;
    const batchPayments = isBatch ? validation.eligibleIds.map((id) => {
      const row = postingPayments.find((item) => item.incomeId === id)!;
      return { id, version: row.version };
    }).sort((left, right) => left.id.localeCompare(right.id)) : [];
    const singlePayment = !isBatch ? postingPayments[0] : null;
    if (pendingSingleRecovery && (isBatch
      || pendingSingleRecovery.incomeId !== singlePayment?.incomeId
      || pendingSingleRecovery.version !== singlePayment?.version
      || pendingSingleRecovery.confirmExcess !== confirmExcess
    )) {
      showFeedback(errorResponse("Hay un ingreso individual con resultado pendiente. RecupÃ©ralo o reintenta exactamente ese ingreso antes de contabilizar otro."));
      return;
    }
    if (pendingBatchRecovery && (!isBatch
      || JSON.stringify(pendingBatchRecovery.payments) !== JSON.stringify(batchPayments)
      || pendingBatchRecovery.confirmExcess !== confirmExcess
    )) {
      showFeedback(errorResponse("Hay un lote anterior con resultado pendiente. Recupéralo antes de iniciar otra contabilización masiva."));
      return;
    }
    setPosting(true);
    let key = "";
    try {
      key = isBatch
        ? (pendingBatchRecovery?.idempotencyKey ?? createIdempotencyKey())
        : (pendingSingleRecovery?.idempotencyKey ?? createIdempotencyKey());
      if (isBatch && !pendingBatchRecovery) persistBatchRecovery({ idempotencyKey: key, payments: batchPayments, confirmExcess });
      if (!isBatch && !pendingSingleRecovery && singlePayment) persistSingleRecovery({ idempotencyKey: key, incomeId: singlePayment.incomeId, version: singlePayment.version, confirmExcess });
      const result = !isBatch
        ? await postIncome(postingPayments[0], key, confirmExcess)
        : await postIncomeBatch(batchPayments, key, confirmExcess);
      showFeedback(successResponse(result?.message || "Ingreso(s) contabilizado(s) correctamente."));
      if (isBatch) clearBatchRecovery();
      else clearSingleRecovery();
      setPostingPayments([]);
      setSelectedIncomeIds([]);
      await loadIncome();
    } catch (caught: unknown) {
      const error = normalizeIncomeApiError(caught);
      const status = error.response?.status;
      if (isBatch && (status === undefined || status >= 500) && key) {
        try {
          await getIncomeBatchResult(key);
          clearBatchRecovery();
          setPostingPayments([]);
          setSelectedIncomeIds([]);
          showFeedback(successResponse("La contabilización se completó. Se recuperó el resultado del lote."));
          await loadIncome();
          return;
        } catch { /* Se conserva la clave y la selección para recuperar o reintentar el mismo lote. */ }
      }
      if (!isBatch && (status === undefined || status >= 500) && key) {
        try {
          await getIncomePostingResult(key);
          clearSingleRecovery();
          setPostingPayments([]);
          setSelectedIncomeIds([]);
          showFeedback(successResponse("La contabilizaciÃ³n se completÃ³. Se recuperÃ³ el resultado del ingreso."));
          await loadIncome();
          return;
        } catch { /* Mantiene la clave para consultar o reintentar el mismo ingreso. */ }
      }
      if (isBatch && status !== undefined && status >= 400 && status < 500) clearBatchRecovery();
      if (!isBatch && status !== undefined && status >= 400 && status < 500) clearSingleRecovery();
      const message = error?.response?.data?.message ?? "No se pudo contabilizar el ingreso. Actualiza la información e inténtalo nuevamente.";
      const detail = Array.isArray(message) ? message.join(" ") : message;
      showFeedback(errorResponse(!error?.response
        ? isBatch
          ? "No se pudo confirmar la respuesta del lote. Se conserva su clave; consulta o reintenta exactamente la misma seleccion."
          : "No se pudo confirmar la respuesta del ingreso. Se conserva su clave; consulta o reintenta exactamente el mismo ingreso."
        : detail));
    } finally { setPosting(false); }
  }, [clearBatchRecovery, clearSingleRecovery, loadIncome, pendingBatchRecovery, pendingClosureRecoveries.length, pendingReentryRecoveries.length, pendingSingleRecovery, persistBatchRecovery, persistSingleRecovery, posting, postingPayments, showFeedback]);

  const recoverPendingBatch = useCallback(async () => {
    if (!pendingBatchRecovery || recoveringBatch) return;
    setRecoveringBatch(true);
    try {
      try {
        await getIncomeBatchResult(pendingBatchRecovery.idempotencyKey);
      } catch (caught: unknown) {
        const error = normalizeIncomeApiError(caught);
        if (error.response?.status !== 404) throw caught;
        // The original POST may never have reached the API. Replay the exact persisted command;
        // the same idempotency key is also safe if the original request is still committing.
        await postIncomeBatch(pendingBatchRecovery.payments, pendingBatchRecovery.idempotencyKey, pendingBatchRecovery.confirmExcess);
      }
      clearBatchRecovery();
      setPostingPayments([]);
      setSelectedIncomeIds([]);
      showFeedback(successResponse("Resultado del lote recuperado correctamente."));
      await loadIncome();
    } catch (caught: unknown) {
      const error = normalizeIncomeApiError(caught);
      const code = error?.response?.data?.code;
      showFeedback(errorResponse(code === "BATCH_RESULT_NOT_READY"
        ? "El lote aún no tiene un resultado disponible. Espera unos segundos y vuelve a consultar."
        : error?.response?.status === 404
          ? "Todavía no hay resultado confirmado. Si los ingresos siguen pendientes, reintenta exactamente el mismo lote."
          : "No se pudo consultar el resultado del lote. Conservamos su clave para reintentar la consulta."));
    } finally {
      setRecoveringBatch(false);
    }
  }, [clearBatchRecovery, loadIncome, pendingBatchRecovery, recoveringBatch, showFeedback]);

  const recoverPendingSingle = useCallback(async () => {
    if (!pendingSingleRecovery || recoveringBatch) return;
    setRecoveringBatch(true);
    try {
      try {
        await getIncomePostingResult(pendingSingleRecovery.idempotencyKey);
      } catch (caught: unknown) {
        const error = normalizeIncomeApiError(caught);
        if (error.response?.status !== 404) throw caught;
        // Re-send only the original income/version/confirmation with its original idempotency key.
        await postIncome(
          { incomeId: pendingSingleRecovery.incomeId, version: pendingSingleRecovery.version },
          pendingSingleRecovery.idempotencyKey,
          pendingSingleRecovery.confirmExcess,
        );
      }
      clearSingleRecovery();
      setPostingPayments([]);
      setSelectedIncomeIds([]);
      showFeedback(successResponse("Resultado de la contabilizaciÃ³n individual recuperado correctamente."));
      await loadIncome();
    } catch (caught: unknown) {
      const error = normalizeIncomeApiError(caught);
      const code = error?.response?.data?.code;
      showFeedback(errorResponse(code === "BATCH_RESULT_NOT_READY"
        ? "La operaciÃ³n aÃºn no tiene un resultado disponible. Espera unos segundos y vuelve a consultar."
        : error?.response?.status === 404
          ? "TodavÃ­a no hay resultado confirmado. Si el ingreso sigue pendiente, reintenta contabilizar ese mismo ingreso."
          : "No se pudo consultar el resultado del ingreso. Conservamos su clave para reintentar la consulta."));
    } finally { setRecoveringBatch(false); }
  }, [clearSingleRecovery, loadIncome, pendingSingleRecovery, recoveringBatch, showFeedback]);

  const reenteringIncomeId = reenteringIncome?.incomeId;
  useEffect(() => {
    if (!reenteringIncomeId || !can("payments.view_evidence")) { setReenterEvidenceUrl(null); return; }
    let active = true; let objectUrl: string | null = null;
    setReenterEvidenceLoading(true); setReenterEvidenceUrl(null);
    void getIncomeEvidence(reenteringIncomeId)
      .then((summary) => summary.available || summary.url ? getIncomeEvidenceContent(reenteringIncomeId) : null)
      .then((url) => { if (active) { objectUrl = url; setReenterEvidenceUrl(url); } else if (url && typeof URL.revokeObjectURL === "function") URL.revokeObjectURL(url); })
      .catch(() => { if (active) showFeedback(errorResponse("No se pudo cargar la evidencia de referencia.")); })
      .finally(() => { if (active) setReenterEvidenceLoading(false); });
    return () => { active = false; if (objectUrl && typeof URL.revokeObjectURL === "function") URL.revokeObjectURL(objectUrl); };
  }, [can, reenteringIncomeId, showFeedback]);

  const handleReenter = useCallback(async (draft: SaleIncomeModalValues, file: File | null) => {
    if (!reenteringIncome || reentering) return;
    const payload = {
      reason: draft.reason.trim(),
      amount: Math.round((Number(draft.amount) + Number.EPSILON) * 100) / 100,
      date: draft.date,
      paymentMethodId: draft.paymentMethodId,
      companyPaymentAccountId: draft.companyPaymentAccountId,
      operationNumber: draft.operationNumber.trim() || null,
      note: draft.note.trim() || null,
    };
    const existing = pendingReentryRecoveries.find((operation) => operation.incomeId === reenteringIncome.incomeId);
    if (pendingReentryRecoveries.length && !existing) {
      showFeedback(errorResponse("Primero confirma el reingreso pendiente antes de iniciar otro."));
      return;
    }
    if (!userId) {
      showFeedback(errorResponse("No se pudo guardar de forma segura la solicitud de reingreso. Vuelve a iniciar sesión."));
      return;
    }
    if (existing && Object.entries(payload).some(([key, value]) => existing.payload[key] !== value)) {
      showFeedback(errorResponse("Hay un reingreso con resultado incierto. Recupera primero la solicitud original sin cambiar sus datos."));
      return;
    }
    const operation: PendingIncomeOperation = existing ?? {
      operationId: `income.reenter:${reenteringIncome.incomeId}`,
      userId,
      incomeId: reenteringIncome.incomeId,
      kind: "income.reenter",
      idempotencyKey: createIdempotencyKey(),
      payload,
      createdAt: new Date().toISOString(),
    };
    if (!existing) rememberReentryRecovery(operation);
    setReentering(true); setReenterError(null);
    try {
      let createdId = reenteredIncomeId;
      if (!createdId) {
        const created = await executeReentryRecovery(operation);
        createdId = created?.incomeId;
        if (!createdId) throw new Error("El servidor no devolvió el identificador del ingreso reingresado.");
        forgetReentryRecovery(operation);
        setReenteredIncomeId(createdId);
      }
      if (file) {
        try {
          const evidenceOperation = getOrCreatePendingIncomeEvidenceUpload(userId, createdId);
          await uploadIncomeEvidence(createdId, file, evidenceOperation.idempotencyKey);
          clearPendingIncomeEvidenceUpload(userId, createdId);
        }
        catch (caught: unknown) {
          const error = normalizeIncomeApiError(caught);
          if (!shouldRetainPendingIncomeEvidenceUpload(error)) clearPendingIncomeEvidenceUpload(userId, createdId);
          const retryHint = error?.response?.data?.code === "IDEMPOTENCY_KEY_REUSED"
            ? "La clave previa se usó con otro archivo; vuelve a guardar para iniciar una carga nueva."
            : "Puedes reintentar con el mismo archivo.";
          const message = `El ingreso por confirmar sí se creó, pero no se pudo subir la evidencia: ${error?.response?.data?.message ?? "error de carga"}. ${retryHint}`;
          setReenterError(message); await loadIncome(); return;
        }
      }
      showFeedback(successResponse("Se creó un nuevo ingreso por confirmar."));
      setReenteringIncome(null); setReenteredIncomeId(null); await loadIncome();
    } catch (caught: unknown) {
      const error = normalizeIncomeApiError(caught);
      const responseMessage = error?.response?.data?.message ?? "No se pudo reingresar el cobro.";
      const message = Array.isArray(responseMessage) ? responseMessage.join(" ") : responseMessage;
      const status = error?.response?.status;
      if (status !== undefined && status >= 400 && status < 500 && status !== 408 && status !== 429) {
        forgetReentryRecovery(operation);
      } else if (!reenteredIncomeId) {
        setReenteringIncome(null);
        setReenterError(null);
      }
      setReenterError(message); showFeedback(errorResponse(message));
    } finally { setReentering(false); }
  }, [executeReentryRecovery, forgetReentryRecovery, loadIncome, pendingReentryRecoveries, reentering, reenteringIncome, reenteredIncomeId, rememberReentryRecovery, showFeedback, userId]);

  const selectedPending = rows.filter((row) => selectedIncomeIds.includes(row.incomeId) && row.status === "PENDING_CONFIRMATION");
  const handleSelectionChange = useCallback((keys: string[], meta: { selectedRows: Income[] }) => {
    const pending = meta.selectedRows.filter((row) => row.status === "PENDING_CONFIRMATION");
    const dates = new Set(pending.map((row) => (row.paymentDate ?? row.date).slice(0, 10)));
    if (dates.size > 1) {
      // Keep the previously valid one-day batch and reject only the incompatible toggle.
      showFeedback(errorResponse("Solo puedes contabilizar ingresos de una misma fecha. Desmarca la selección y elige un solo día."));
      return;
    }
    setSelectedIncomeIds(keys.filter((key) => pending.some((row) => row.incomeId === key)));
  }, [showFeedback]);

  const chips = useMemo(() => buildIncomeSearchChips(executedSnapshot, catalogs), [catalogs, executedSnapshot]);
  const hasCriteria = Boolean(executedSnapshot.q || executedSnapshot.filters.length);
  const toolbarSearchContent = (
    <DataTableSearchBar
      value={searchText}
      onChange={setSearchText}
      onSubmitSearch={() => {
        setAppliedSearchText(searchText.trim());
        setPage(1);
      }}
      searchLabel="Buscar ingreso..."
      searchName="income-smart-search"
      canSaveMetric={canSaveMetric}
      saveLoading={savingMetric}
      onSaveMetric={handleSaveMetric}
    >
      <IncomeSmartSearchPanel
        snapshot={draftSnapshot}
        catalogs={catalogs}
        recent={recentSearches}
        saved={savedMetrics}
        filterQuery={searchText}
        onApplySnapshot={applySnapshot}
        onApplyRule={applyRule}
        onRemoveRule={(field) => {
          setSearchFilters(removeIncomeRule(draftSnapshot, field).filters);
          setPage(1);
        }}
        onDeleteMetric={handleDeleteMetric}
      />
    </DataTableSearchBar>
  );

  return (
    <PageShell className="bg-white" scrollArea>
      <IncomeKpiStrip summary={summary} loading={loading} onStatusFilter={setStatus} onObservedFilter={handleObservedFilter} onCustomerCreditFilter={handleCustomerCreditFilter} />
      {pendingReentryRecoveries.length > 0 ? <section className="mx-4 my-3 space-y-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950" role="status" aria-label="Operaciones de reingreso por recuperar">
        <p>Hay un reingreso con respuesta incierta. Repite exactamente la solicitud original para confirmar si el nuevo pago fue creado.</p>
        {pendingReentryRecoveries.map((operation) => <div key={operation.operationId} className="flex flex-wrap items-center justify-between gap-3">
          <span>Reingreso de {operation.incomeId}</span>
          <button type="button" className="min-h-11 rounded-md border border-amber-700 px-3 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700/50 disabled:opacity-60" onClick={() => void recoverPendingReentry(operation)} disabled={reentering}>
            {reentering ? "Consultando reingreso…" : "Recuperar resultado del reingreso"}
          </button>
        </div>)}
      </section> : null}
      {pendingTransferRecoveries.length > 0 ? <section className="mx-4 my-3 space-y-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950" role="status" aria-label="Transferencias por recuperar">
        <p>Hay una transferencia con respuesta incierta. Repite la solicitud original para confirmar el pedido destino antes de iniciar otra operación.</p>
        {pendingTransferRecoveries.map((operation) => <div key={operation.operationId} className="flex flex-wrap items-center justify-between gap-3">
          <span>Transferencia del ingreso {operation.incomeId}</span>
          <button type="button" className="min-h-11 rounded-md border border-amber-700 px-3 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700/50 disabled:opacity-60" onClick={() => void recoverPendingTransfer(operation)} disabled={recoveringTransfer}>
            {recoveringTransfer ? "Consultando transferencia…" : "Recuperar resultado de la transferencia"}
          </button>
        </div>)}
      </section> : null}
      {pendingCorrectionRecoveries.length > 0 ? <section className="mx-4 my-3 space-y-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950" role="status" aria-label="Correcciones por recuperar">
        <p>Hay una corrección con respuesta incierta. Repite exactamente la operación original para confirmar la reversa y el nuevo ingreso antes de iniciar otra corrección. Si adjuntaste evidencia, podrás subirla al reemplazo desde Actualizar evidencia corregida después de recuperarla.</p>
        {pendingCorrectionRecoveries.map((operation) => <div key={operation.operationId} className="flex flex-wrap items-center justify-between gap-3">
          <span>Corrección del ingreso {operation.incomeId}</span>
          <button type="button" className="min-h-11 rounded-md border border-amber-700 px-3 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700/50 disabled:opacity-60" onClick={() => void recoverPendingCorrection(operation)} disabled={recoveringCorrection}>
            {recoveringCorrection ? "Consultando corrección…" : "Recuperar resultado de la corrección"}
          </button>
        </div>)}
      </section> : null}
      {pendingClosureRecoveries.length > 0 ? <section className="mx-4 my-3 space-y-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950" role="status" aria-label="Operaciones de cierre por recuperar">
        <p>Hay una anulación con respuesta incierta. Repite la solicitud original para confirmar el resultado antes de iniciar otro cierre o contabilización.</p>
        {pendingClosureRecoveries.map((operation) => <div key={operation.operationId} className="flex flex-wrap items-center justify-between gap-3">
          <span>{operation.kind === "income.cancel" ? "Cancelar ingreso pendiente" : "Revertir ingreso contabilizado"}</span>
          <button type="button" className="min-h-11 rounded-md border border-amber-700 px-3 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700/50 disabled:opacity-60" onClick={() => void recoverPendingClosure(operation)} disabled={voiding}>
            {voiding ? "Consultando resultado…" : "Recuperar resultado de la anulación"}
          </button>
        </div>)}
      </section> : null}
      {pendingBatchRecovery && can("sale_orders.payments.post_bulk") ? <div className="mx-4 my-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950" role="status">
        <p>Hay una contabilización masiva cuyo resultado debe verificarse. Consulta el lote antes de iniciar otra operación.</p>
        <button type="button" className="min-h-11 rounded-md border border-amber-700 px-3 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700/50 disabled:opacity-60" onClick={() => void recoverPendingBatch()} disabled={recoveringBatch}>
          {recoveringBatch ? "Consultando lote…" : "Recuperar resultado del lote"}
        </button>
      </div> : null}
      {pendingSingleRecovery && can("sale_orders.payments.post") ? <div className="mx-4 my-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950" role="status">
        <p>Hay una contabilizaciÃ³n individual cuyo resultado debe verificarse. Consulta el ingreso antes de iniciar otra operaciÃ³n.</p>
        <button type="button" className="min-h-11 rounded-md border border-amber-700 px-3 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700/50 disabled:opacity-60" onClick={() => void recoverPendingSingle()} disabled={recoveringBatch}>
          {recoveringBatch ? "Consultando ingresoâ€¦" : "Recuperar resultado del ingreso"}
        </button>
      </div> : null}
      <DataTableSearchChips chips={chips} onRemove={removeCriterion} />
      <IncomeTable
        rows={rows}
        loading={loading}
        canPost={can("sale_orders.payments.post")}
        canCancel={can("sale_orders.payments.cancel_pending")}
        canReverse={can("sale_orders.payments.reverse_posted")}
        canReenter={can("sale_orders.payments.reenter_closed")}
        canEditPending={can("sale_orders.payments.update_pending")}
        canTransferPending={can("sale_orders.payments.transfer_pending") && pendingTransferRecoveries.length === 0}
        canCorrectPosted={can("sale_orders.payments.correct_posted") && pendingCorrectionRecoveries.length === 0}
        canReplaceCorrectedEvidence={can("sale_orders.payments.correct_posted") && can("payments.attach_evidence")}
        canViewEvidence={can("payments.view_evidence")}
        canViewRefunds={can("customer_refunds.view")}
        canViewReconciliation={can("income.reconciliation.view")}
        onVoid={(row) => { setClosingAction(row.status === "PENDING_CONFIRMATION" ? "cancel" : "reverse"); setVoidingIncome(row); }}
        onPost={(row) => {
          if (row.status === "CANCELLED" || row.status === "REVERSED") { setReenteringIncome(row); setReenteredIncomeId(null); setReenterError(null); }
          else setPostingPayments([row]);
        }}
        selectedRowKeys={selectedIncomeIds}
        onSelectedRowKeysChange={can("sale_orders.payments.post_bulk") ? handleSelectionChange : undefined}
        toolbarActions={<div className="flex flex-wrap items-center gap-2">
          {can("income.reconciliation.view") ? <button type="button" className="min-h-10 rounded-md border border-sky-800 px-3 text-sm font-semibold text-sky-900 hover:bg-sky-50" onClick={() => setReconciliationReportOpen(true)}>Informe de conciliación</button> : null}
          {can("income.export") ? <ExportPopover columns={INCOME_EXPORT_COLUMNS} loading={exporting} onExport={handleExportIncome} /> : null}
          {can("sale_orders.payments.post_bulk") ? <button type="button" className="min-h-10 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground disabled:opacity-50" disabled={!selectedPending.length || posting} onClick={() => setPostingPayments(selectedPending)}>Contabilizar seleccionados ({selectedPending.length})</button> : null}
        </div>}
        onEvidence={setEvidenceIncome}
        onEdit={setEditingIncome}
        onTransfer={setTransferringIncome}
        onCorrect={setCorrectingIncome}
        onRefunds={setRefundIncome}
        onReconciliation={setReconciliationIncome}
        toolbarSearchContent={toolbarSearchContent}
        emptyMessage={hasCriteria ? "No hay ingresos que coincidan con la búsqueda y los filtros." : "Sin ingresos para mostrar."}
        rangeDates={{ startDate: parseDateInputValue(range.from), endDate: parseDateInputValue(range.to), onChange: changeRange, label: "Período", name: "income-period" }}
        pagination={{ page, limit: 25, total }}
        onPageChange={setPage}
      />
      <VoidIncomeModal open={Boolean(voidingIncome)} income={voidingIncome} action={closingAction} loading={voiding} onClose={() => setVoidingIncome(null)} onConfirm={handleVoid} />
      <IncomePostConfirmationModal open={postingPayments.length > 0} payments={postingPayments} loading={posting} onClose={() => setPostingPayments([])} onConfirm={handlePost} />
      <IncomePaymentEvidenceModal open={Boolean(evidenceIncome)} income={evidenceIncome} canViewEvidence={can("payments.view_evidence")} canViewRevisionHistory={can("income.audit.view") && can("payments.view_evidence")} canManageEvidenceQuarantine={can("income.audit.view") && can("income.evidence.quarantine.manage")} onClose={() => setEvidenceIncome(null)} />
      <IncomePendingEditModal open={Boolean(editingIncome)} income={editingIncome} userId={userId} canViewEvidence={can("payments.view_evidence")} canAttachEvidence={can("payments.attach_evidence")} onClose={() => setEditingIncome(null)} onSaved={loadIncome} />
      <TransferPendingIncomeModal open={Boolean(transferringIncome)} income={transferringIncome} onClose={() => setTransferringIncome(null)} onTransferred={loadIncome} onTransferUncertain={rememberTransferRecovery} />
      <CorrectPostedIncomeModal open={Boolean(correctingIncome)} income={correctingIncome} canViewEvidence={can("payments.view_evidence")} canReplaceEvidence={can("payments.attach_evidence") && can("sale_orders.payments.correct_posted")} onClose={() => setCorrectingIncome(null)} onSaved={loadIncome} onCorrectionPending={rememberCorrectionRecovery} onCorrectionResolved={forgetCorrectionRecovery} />
      <IncomeRefundsModal open={Boolean(refundIncome)} income={refundIncome} canCreate={can("customer_refunds.create")} canPost={can("customer_refunds.post")} canCancel={can("customer_refunds.cancel")} canReverse={can("customer_refunds.reverse")} onClose={() => setRefundIncome(null)} onSaved={loadIncome} />
      <IncomeReconciliationModal open={Boolean(reconciliationIncome)} income={reconciliationIncome} canReconcile={can("income.reconciliation.reconcile")} canUnreconcile={can("income.reconciliation.unreconcile")} onClose={() => setReconciliationIncome(null)} onSaved={loadIncome} />
      <BankReconciliationReportModal open={reconciliationReportOpen} onClose={() => setReconciliationReportOpen(false)} />
      <SaleIncomeModal open={Boolean(reenteringIncome)} mode="reenter" values={reenteringIncome ? {
        id: reenteringIncome.incomeId, version: reenteringIncome.version, amount: reenteringIncome.amount,
        date: (reenteringIncome.paymentDate ?? reenteringIncome.date).slice(0, 10),
        paymentMethodId: reenteringIncome.paymentMethodId ?? "", companyPaymentAccountId: reenteringIncome.companyPaymentAccountId ?? "",
        operationNumber: "", note: reenteringIncome.detail ?? "", reason: "", status: "PENDING_CONFIRMATION", currency: reenteringIncome.currency,
      } : null} description={reenteringIncome ? `${reenteringIncome.saleOrderNumber} · ${reenteringIncome.clientName} · Operación anterior: ${reenteringIncome.operationNumber || "sin número"}` : undefined}
        evidenceUrl={reenterEvidenceUrl} evidenceLoading={reenterEvidenceLoading} canViewEvidence={can("payments.view_evidence")} canUploadEvidence={can("payments.attach_evidence")}
        methodOptions={paymentOptions.methodOptions} bankAccountOptions={paymentOptions.bankAccountOptions} getCompatibleAccounts={filterSaleOrderBankAccountOptions}
        saving={reentering} financialFieldsReadOnly={Boolean(reenteredIncomeId)} errorMessage={reenterError}
        onClose={() => { if (!reentering) { setReenteringIncome(null); setReenteredIncomeId(null); } }} onSubmit={(draft, file) => void handleReenter(draft, file)} />
    </PageShell>
  );
}
