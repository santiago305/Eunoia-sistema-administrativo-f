import { BadgeCheck, ChartNoAxesCombined, CircleAlert, Clock3, ReceiptText, WalletCards, HandCoins } from "lucide-react";
import type { IncomeSummary } from "../types/income.types";
import { SummaryMetricCards, type SummaryMetricItem } from "@/shared/components/metrics/SummaryMetricCards";

type Props = {
  summary: IncomeSummary | null;
  loading?: boolean;
  onStatusFilter?: (status: "PENDING_CONFIRMATION" | "POSTED" | "CANCELLED" | "REVERSED") => void;
  onObservedFilter?: () => void;
  onCustomerCreditFilter?: () => void;
};

export function IncomeKpiStrip({ summary, loading = false, onStatusFilter, onObservedFilter, onCustomerCreditFilter }: Props) {
  const metrics = summary?.currencyMetrics?.length
    ? summary.currencyMetrics
    : summary
      ? [{
        currency: "PEN",
        totalCollected: summary.totalCollected,
        totalPending: summary.totalPending,
        ordersPaid: summary.ordersPaid,
        ordersPending: summary.ordersPending,
        postedPaymentsCount: summary.postedPaymentsCount ?? 0,
        averageCollectedPayment: summary.averageCollectedPayment ?? 0,
        collectionEffectiveness: summary.collectionEffectiveness ?? 0,
        observedPaymentsCount: summary.observedPaymentsCount ?? 0,
        observedPaymentsAmount: summary.observedPaymentsAmount ?? 0,
        voidedPaymentsCount: summary.voidedPaymentsCount ?? 0,
        voidedPaymentsAmount: summary.voidedPaymentsAmount ?? 0,
      }]
      : [];

  const items: SummaryMetricItem[] = metrics.flatMap((metric) => [
    { key: `collected-${metric.currency}`, label: `Ingresos cobrados (${metric.currency})`, value: metric.totalCollected, currency: metric.currency, format: "currency", tone: "success", Icon: WalletCards, badgeLabel: `${metric.postedPaymentsCount} pagos`, description: "Cobros contabilizados", onClick: () => onStatusFilter?.("POSTED") },
    { key: `pending-${metric.currency}`, label: `Saldo pendiente (${metric.currency})`, value: metric.totalPending, currency: metric.currency, format: "currency", tone: "warning", Icon: Clock3, badgeLabel: `${metric.ordersPending} pedidos`, description: "Saldo por cobrar" },
    { key: `effectiveness-${metric.currency}`, label: `Efectividad (${metric.currency})`, value: metric.collectionEffectiveness, format: "percent", tone: "info", Icon: ChartNoAxesCombined, badgeLabel: "Total", description: "Cobrado sobre venta" },
    { key: `average-${metric.currency}`, label: `Ticket promedio (${metric.currency})`, value: metric.averageCollectedPayment, currency: metric.currency, format: "currency", tone: "neutral", Icon: ReceiptText, badgeLabel: "Promedio", description: "Por pago contabilizado" },
    { key: `observed-${metric.currency}`, label: `Cobros observados (${metric.currency})`, value: metric.observedPaymentsCount, format: "number", tone: "danger", Icon: CircleAlert, badgeLabel: new Intl.NumberFormat("es-PE", { style: "currency", currency: metric.currency }).format(metric.observedPaymentsAmount), description: "Sin evidencia, cuenta o referencia", onClick: onObservedFilter },
    { key: `voided-${metric.currency}`, label: `Ingresos revertidos (${metric.currency})`, value: metric.voidedPaymentsAmount, currency: metric.currency, format: "currency", tone: "danger", Icon: BadgeCheck, badgeLabel: `${metric.voidedPaymentsCount} pagos`, description: "Conservan trazabilidad", onClick: () => onStatusFilter?.("REVERSED") },
  ]);

  for (const credit of summary?.customerCreditByCurrency ?? []) {
    if (credit.incomesCount <= 0 || credit.availableAmount <= 0) continue;
    items.push({
      key: `customer-credit-${credit.currency}`,
      label: `Saldo a favor (${credit.currency})`,
      value: credit.availableAmount,
      currency: credit.currency,
      format: "currency",
      tone: "info",
      Icon: HandCoins,
      badgeLabel: `${credit.incomesCount} ingresos`,
      description: "Excedentes disponibles",
      onClick: onCustomerCreditFilter,
    });
  }

  return <SummaryMetricCards items={items} loading={loading} columnsClassName="grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8" ariaLabel="Resumen de ingresos" />;
}
