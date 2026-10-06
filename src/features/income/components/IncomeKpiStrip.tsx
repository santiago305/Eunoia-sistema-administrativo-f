import { BadgeCheck, ChartNoAxesCombined, CircleAlert, Clock3, ReceiptText, WalletCards } from "lucide-react";
import type { IncomeSummary } from "../types/income.types";
import { SummaryMetricCards, type SummaryMetricItem } from "@/shared/components/metrics/SummaryMetricCards";

type Props = {
  summary: IncomeSummary | null;
  loading?: boolean;
  onStatusFilter?: (status: "POSTED" | "VOIDED") => void;
  onObservedFilter?: () => void;
};

export function IncomeKpiStrip({ summary, loading = false, onStatusFilter, onObservedFilter }: Props) {
  const items: SummaryMetricItem[] = [
    { key: "collected", label: "Ingresos cobrados", value: summary?.totalCollected ?? null, format: "currency", tone: "success", Icon: WalletCards, badgeLabel: `${summary?.postedPaymentsCount ?? 0} pagos`, description: "Cobros contabilizados", onClick: () => onStatusFilter?.("POSTED") },
    { key: "pending", label: "Saldo pendiente", value: summary?.totalPending ?? null, format: "currency", tone: "warning", Icon: Clock3, badgeLabel: `${summary?.ordersPending ?? 0} pedidos`, description: "Saldo por cobrar" },
    { key: "effectiveness", label: "Efectividad de cobranza", value: summary?.collectionEffectiveness ?? null, format: "percent", tone: "info", Icon: ChartNoAxesCombined, badgeLabel: "Total", description: "Cobrado sobre venta" },
    { key: "average", label: "Ticket promedio cobrado", value: summary?.averageCollectedPayment ?? null, format: "currency", tone: "neutral", Icon: ReceiptText, badgeLabel: "Promedio", description: "Por pago contabilizado" },
    { key: "observed", label: "Cobros observados", value: summary?.observedPaymentsCount ?? null, format: "number", tone: "danger", Icon: CircleAlert, badgeLabel: summary ? new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(summary.observedPaymentsAmount ?? 0) : "—", description: "Sin evidencia, cuenta o referencia", onClick: onObservedFilter },
    { key: "voided", label: "Ingresos anulados", value: summary?.voidedPaymentsAmount ?? null, format: "currency", tone: "danger", Icon: BadgeCheck, badgeLabel: `${summary?.voidedPaymentsCount ?? 0} pagos`, description: "Conservan trazabilidad", onClick: () => onStatusFilter?.("VOIDED") },
  ];
  return <SummaryMetricCards items={items} loading={loading} columnsClassName="grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6" ariaLabel="Resumen de ingresos" />;
}
