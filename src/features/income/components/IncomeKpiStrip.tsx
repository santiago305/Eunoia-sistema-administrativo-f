import { BadgeCheck, Clock3, ReceiptText, WalletCards } from "lucide-react";
import type { IncomeSummary } from "../types/income.types";
import { IncomeSummaryCard } from "./IncomeSummaryCard";

type Props = {
  summary: IncomeSummary | null;
};

const money = (value: number) =>
  new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(value || 0);

export function IncomeKpiStrip({ summary }: Props) {
  const registeredPayments =
    summary?.byMethod.reduce((total, method) => total + method.count, 0) ?? 0;

  const kpis = [
    {
      label: "Ingresado",
      value: money(summary?.totalCollected ?? 0),
      detail: `${registeredPayments} pago${registeredPayments === 1 ? "" : "s"} registrado${registeredPayments === 1 ? "" : "s"}`,
      icon: WalletCards,
      tone: "primary" as const,
    },
    {
      label: "Pendiente de ingreso",
      value: money(summary?.totalPending ?? 0),
      detail: "Saldo total por cobrar",
      icon: Clock3,
      tone: "warning" as const,
    },
    {
      label: "Pedidos pagados",
      value: String(summary?.ordersPaid ?? 0),
      detail: "Pedidos sin saldo pendiente",
      icon: BadgeCheck,
      tone: "success" as const,
    },
    {
      label: "Pedidos pendientes",
      value: String(summary?.ordersPending ?? 0),
      detail: "Pedidos que requieren seguimiento",
      icon: ReceiptText,
      tone: "neutral" as const,
    },
  ];

  return (
    <section
      className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
      aria-label="Resumen de ingresos"
    >
      {kpis.map((kpi) => (
        <IncomeSummaryCard key={kpi.label} {...kpi} />
      ))}
    </section>
  );
}
