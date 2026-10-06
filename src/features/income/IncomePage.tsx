import { useCallback, useEffect, useMemo, useState } from "react";
import { PageShell } from "@/shared/layouts/PageShell";
import { listIncome, getIncomeSummary } from "@/shared/services/incomeService";
import type { Income, IncomeListQuery, IncomeSummary } from "./types/income.types";
import { IncomeKpiStrip } from "./components/IncomeKpiStrip";
import { IncomeTable } from "./components/IncomeTable";
import { VoidIncomeModal } from "./components/VoidIncomeModal";
import { voidSaleOrderPayment } from "@/shared/services/saleOrderService";
import { usePermissions } from "@/shared/hooks/usePermissions";
import { useFeedbackToast } from "@/shared/hooks/useFeedbackToast";
import { errorResponse, successResponse } from "@/shared/common/utils/response";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { parseDateInputValue } from "@/shared/utils/functionPurchases";
import { IncomePaymentEvidenceModal } from "./components/IncomePaymentEvidenceModal";

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
  const [statusFilter, setStatusFilter] = useState<"POSTED" | "VOIDED" | "ALL">("POSTED");
  const [range, setRange] = useState(() => currentLimaMonth());
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasEvidence, setHasEvidence] = useState<boolean | undefined>(undefined);
  const [evidenceIncome, setEvidenceIncome] = useState<Income | null>(null);
  const { can } = usePermissions();
  const { showFeedback } = useFeedbackToast();

  const query = useMemo<IncomeListQuery>(() => ({ limit: 25, page, status: statusFilter, from: range.from, to: range.to, hasEvidence }), [hasEvidence, page, range.from, range.to, statusFilter]);
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

  useEffect(() => {
    void loadIncome();
  }, [loadIncome]);

  const changeStatus = (value: "POSTED" | "VOIDED" | "ALL") => { setStatusFilter(value); setHasEvidence(undefined); setPage(1); };
  const changeRange = ({ startDate, endDate }: { startDate: Date | null; endDate: Date | null }) => {
    if (!startDate || !endDate) { setRange(currentLimaMonth()); setPage(1); return; }
    setRange({ from: dateKey(startDate), to: dateKey(endDate) });
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

  return (
    <PageShell className="bg-white" scrollArea>
      <IncomeKpiStrip summary={summary} loading={loading} onStatusFilter={changeStatus} onObservedFilter={() => { setStatusFilter("POSTED"); setHasEvidence(false); setPage(1); }} />
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Estado de ingresos">
        <span className="mr-1 text-xs font-medium text-muted-foreground">Mostrar:</span>
        {([
          ["POSTED", "Contabilizados"],
          ["VOIDED", "Anulados"],
          ["ALL", "Todos"],
        ] as const).map(([value, label]) => (
          <SystemButton
            key={value}
            size="sm"
            variant={statusFilter === value ? "secondary" : "outline"}
            aria-pressed={statusFilter === value}
            onClick={() => changeStatus(value)}
          >
            {label}
          </SystemButton>
        ))}
      </div>
      <IncomeTable rows={rows} loading={loading} canVoid={can("sale_orders.payments.void")} canViewEvidence={can("payments.view_evidence")} canAttachEvidence={can("payments.attach_evidence")} onVoid={setVoidingIncome}
        onEvidence={setEvidenceIncome}
        rangeDates={{ startDate: parseDateInputValue(range.from), endDate: parseDateInputValue(range.to), onChange: changeRange, label: "Período", name: "income-period" }}
        pagination={{ page, limit: 25, total }} onPageChange={setPage} />
      <VoidIncomeModal open={Boolean(voidingIncome)} income={voidingIncome} loading={voiding} onClose={() => setVoidingIncome(null)} onConfirm={handleVoid} />
      <IncomePaymentEvidenceModal open={Boolean(evidenceIncome)} income={evidenceIncome} canViewEvidence={can("payments.view_evidence")} canAttachEvidence={can("payments.attach_evidence")} onClose={() => setEvidenceIncome(null)} onUploaded={loadIncome} />
    </PageShell>
  );
}
