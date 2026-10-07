import { useCallback, useEffect, useMemo, useState } from "react";
import { PageShell } from "@/shared/layouts/PageShell";
import { listIncome, getIncomeSummary } from "@/shared/services/incomeService";
import { getPaymentMethodsByCompany } from "@/shared/services/paymentMethodService";
import { listCompanyPaymentAccountsByCompany } from "@/shared/services/companyPaymentAccountService";
import { useCompany } from "@/shared/hooks/useCompany";
import type { Income, IncomeListQuery, IncomeSearchCatalogs, IncomeSearchSnapshot, IncomeSummary } from "./types/income.types";
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
  const [searchText, setSearchText] = useState("");
  const [snapshot, setSnapshot] = useState<IncomeSearchSnapshot>({ q: "", filters: [] });
  const [catalogs, setCatalogs] = useState<IncomeSearchCatalogs>({ methods: [], accounts: [] });
  const [evidenceIncome, setEvidenceIncome] = useState<Income | null>(null);
  const { company } = useCompany();
  const { can } = usePermissions();
  const { showFeedback } = useFeedbackToast();

  useEffect(() => {
    const companyId = company?.companyId;
    if (!companyId) {
      setCatalogs({ methods: [], accounts: [] });
      return;
    }
    let cancelled = false;
    void Promise.all([getPaymentMethodsByCompany(companyId), listCompanyPaymentAccountsByCompany(companyId)])
      .then(([methods, accounts]) => {
        if (cancelled) return;
        setCatalogs({
          methods: methods.filter((method) => method.isActive !== false).map((method) => ({ id: method.methodId, label: method.name, keywords: [method.code ?? ""] })),
          accounts: accounts.filter((account) => account.isActive !== false).map((account) => ({ id: account.id, label: account.maskedLabel || account.name, keywords: [account.bankName ?? "", account.institutionName ?? ""] })),
        });
      })
      .catch(() => {
        if (!cancelled) setCatalogs({ methods: [], accounts: [] });
      });
    return () => { cancelled = true; };
  }, [company?.companyId]);

  const query = useMemo<IncomeListQuery>(() => ({
    limit: 25,
    page,
    status: "ALL",
    from: range.from,
    to: range.to,
    q: snapshot.q || undefined,
    filters: snapshot.filters,
  }), [page, range.from, range.to, snapshot]);

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
    } catch {
      showFeedback(errorResponse("No se pudo cargar la información de ingresos."));
    } finally {
      setLoading(false);
    }
  }, [query, showFeedback]);

  useEffect(() => { void loadIncome(); }, [loadIncome]);

  const applySnapshot = useCallback((next: Partial<IncomeSearchSnapshot>) => {
    const normalized = normalizeIncomeSnapshot(next);
    setSnapshot(normalized);
    setSearchText(normalized.q);
    setPage(1);
  }, []);

  const applyRule = useCallback((rule: IncomeSearchSnapshot["filters"][number]) => {
    applySnapshot(upsertIncomeRule(snapshot, rule));
  }, [applySnapshot, snapshot]);

  const removeCriterion = useCallback((chip: { removeKey: "q" | IncomeSearchSnapshot["filters"][number]["field"] }) => {
    if (chip.removeKey === "q") applySnapshot({ ...snapshot, q: "" });
    else applySnapshot(removeIncomeRule(snapshot, chip.removeKey));
  }, [applySnapshot, snapshot]);

  const setStatus = useCallback((status: "POSTED" | "VOIDED") => {
    applyRule({ field: "status", operator: "in", values: [status] });
  }, [applyRule]);

  const handleObservedFilter = useCallback(() => {
    let next = upsertIncomeRule(snapshot, { field: "status", operator: "in", values: ["POSTED"] });
    next = upsertIncomeRule(next, { field: "hasEvidence", operator: "in", values: ["false"] });
    applySnapshot(next);
  }, [applySnapshot, snapshot]);

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

  const chips = useMemo(() => buildIncomeSearchChips(snapshot, catalogs), [catalogs, snapshot]);
  const hasCriteria = Boolean(snapshot.q || snapshot.filters.length);
  const toolbarSearchContent = (
    <DataTableSearchBar
      value={searchText}
      onChange={setSearchText}
      onSubmitSearch={() => applySnapshot({ ...snapshot, q: searchText })}
      searchLabel="Buscar N.º de pedido"
      searchName="income-smart-search"
      helperText="Ej.: 534 o PE-531"
    >
      <IncomeSmartSearchPanel
        snapshot={snapshot}
        catalogs={catalogs}
        onApplySnapshot={applySnapshot}
        onApplyRule={applyRule}
        onRemoveRule={(field) => applySnapshot(removeIncomeRule(snapshot, field))}
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
