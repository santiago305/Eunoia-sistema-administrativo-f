import { useCallback, useEffect, useMemo, useState } from "react";
import { PageShell } from "@/shared/layouts/PageShell";
import {
  deleteIncomeSearchMetric,
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
import { voidSaleOrderPayment } from "@/shared/services/saleOrderService";
import { usePermissions } from "@/shared/hooks/usePermissions";
import { useFeedbackToast } from "@/shared/hooks/useFeedbackToast";
import { errorResponse, successResponse } from "@/shared/common/utils/response";
import { parseDateInputValue } from "@/shared/utils/functionPurchases";
import { IncomePaymentEvidenceModal } from "./components/IncomePaymentEvidenceModal";
import { DataTableSearchBar, DataTableSearchChips } from "@/shared/components/table/search";
import { buildIncomeSearchChips, normalizeIncomeSnapshot, removeIncomeRule, upsertIncomeRule } from "./utils/incomeSmartSearch";

const LIMA_TIME_ZONE = "America/Lima";
const dateKey = (date: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: LIMA_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
const currentLimaMonth = () => {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: LIMA_TIME_ZONE, year: "numeric", month: "2-digit" }).formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value ?? "2026";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const last = new Date(Date.UTC(Number(year), Number(month), 0)).toISOString().slice(0, 10);
  return { from: `${year}-${month}-01`, to: last };
};

export default function IncomePage() {
  const [rows, setRows] = useState<Income[]>([]);
  const [summary, setSummary] = useState<IncomeSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [voidingIncome, setVoidingIncome] = useState<Income | null>(null);
  const [voiding, setVoiding] = useState(false);
  const [range, setRange] = useState(() => currentLimaMonth());
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchState, setSearchState] = useState<IncomeSearchStateResponse | null>(null);
  const [savingMetric, setSavingMetric] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [appliedSearchText, setAppliedSearchText] = useState("");
  const [searchFilters, setSearchFilters] = useState<IncomeSearchSnapshot["filters"]>([]);
  const [evidenceIncome, setEvidenceIncome] = useState<Income | null>(null);
  const { can } = usePermissions();
  const { showFeedback } = useFeedbackToast();

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

  useEffect(() => { void loadIncome(); }, [loadIncome]);

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

  const setStatus = useCallback((status: "POSTED" | "VOIDED") => {
    applyRule({ field: "status", operator: "in", values: [status] });
  }, [applyRule]);

  const handleObservedFilter = useCallback(() => {
    let next = upsertIncomeRule(draftSnapshot, { field: "status", operator: "in", values: ["POSTED"] });
    next = upsertIncomeRule(next, { field: "hasEvidence", operator: "in", values: ["false"] });
    setSearchFilters(next.filters);
    setPage(1);
  }, [draftSnapshot]);

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

  const handleVoid = useCallback(async (reason: string) => {
    if (!voidingIncome || voiding) return;
    setVoiding(true);
    try {
      const result = await voidSaleOrderPayment(voidingIncome.saleOrderId, voidingIncome.incomeId, reason);
      showFeedback(successResponse(result.message));
      setVoidingIncome(null);
      await loadIncome();
    } catch (error: any) {
      const message = error?.response?.data?.message ?? "No se pudo anular el ingreso. Actualiza la información e inténtalo nuevamente.";
      showFeedback(errorResponse(Array.isArray(message) ? message.join(" ") : message));
      if (error?.response?.status === 409) setVoidingIncome(null);
    } finally {
      setVoiding(false);
    }
  }, [loadIncome, showFeedback, voiding, voidingIncome]);

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
      <IncomeKpiStrip summary={summary} loading={loading} onStatusFilter={setStatus} onObservedFilter={handleObservedFilter} />
      <DataTableSearchChips chips={chips} onRemove={removeCriterion} />
      <IncomeTable
        rows={rows}
        loading={loading}
        canVoid={can("sale_orders.payments.void")}
        canViewEvidence={can("payments.view_evidence")}
        canAttachEvidence={can("payments.attach_evidence")}
        onVoid={setVoidingIncome}
        onEvidence={setEvidenceIncome}
        toolbarSearchContent={toolbarSearchContent}
        emptyMessage={hasCriteria ? "No hay ingresos que coincidan con la búsqueda y los filtros." : "Sin ingresos para mostrar."}
        rangeDates={{ startDate: parseDateInputValue(range.from), endDate: parseDateInputValue(range.to), onChange: changeRange, label: "Período", name: "income-period" }}
        pagination={{ page, limit: 25, total }}
        onPageChange={setPage}
      />
      <VoidIncomeModal open={Boolean(voidingIncome)} income={voidingIncome} loading={voiding} onClose={() => setVoidingIncome(null)} onConfirm={handleVoid} />
      <IncomePaymentEvidenceModal open={Boolean(evidenceIncome)} income={evidenceIncome} canViewEvidence={can("payments.view_evidence")} canAttachEvidence={can("payments.attach_evidence")} onClose={() => setEvidenceIncome(null)} onUploaded={loadIncome} />
    </PageShell>
  );
}
