import { AlertTriangle, CheckCircle2, Clock3, CreditCard, FileCheck2, FileClock, Inbox, WalletCards } from "lucide-react";
import type { PurchaseDashboardSummary } from "@/features/purchases/types/purchase-dashboard.types";
import { money } from "@/shared/utils/functionPurchases";

type Props = {
  summary: PurchaseDashboardSummary;
};

export function PurchaseKpiGrid({ summary }: Props) {
  const items = [
    { label: "Total comprado", value: money(summary.totalPurchased, "PEN"), icon: FileCheck2, tone: "border-sky-200 bg-sky-50 text-sky-900" },
    { label: "Total pagado", value: money(summary.totalPaid, "PEN"), icon: CreditCard, tone: "border-emerald-200 bg-emerald-50 text-emerald-900" },
    { label: "Pendiente", value: money(summary.pending, "PEN"), icon: WalletCards, tone: "border-amber-200 bg-amber-50 text-amber-900" },
    { label: "Vencido", value: money(summary.overdue, "PEN"), icon: AlertTriangle, tone: "border-rose-200 bg-rose-50 text-rose-900" },
    { label: "Borradores", value: String(summary.drafts), icon: FileClock, tone: "border-zinc-200 bg-zinc-50 text-zinc-900" },
    { label: "Compras por aprobar", value: String(summary.toApprove), icon: Clock3, tone: "border-violet-200 bg-violet-50 text-violet-900" },
    { label: "Pagos por aprobar", value: String(summary.paymentsToApprove), icon: Inbox, tone: "border-cyan-200 bg-cyan-50 text-cyan-900" },
    { label: "Recibidas", value: String(summary.received), icon: CheckCircle2, tone: "border-lime-200 bg-lime-50 text-lime-900" },
  ];

  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Indicadores principales de compras">
      {items.map(({ label, value, icon: Icon, tone }) => (
        <article key={label} className={`min-h-28 rounded-md border px-4 py-3 ${tone}`}>
          <div className="flex items-start justify-between gap-3">
            <p className="text-xs font-medium opacity-75">{label}</p>
            <Icon className="h-5 w-5 shrink-0 opacity-75" aria-hidden="true" />
          </div>
          <p className="mt-3 break-words text-2xl font-semibold tabular-nums">{value}</p>
        </article>
      ))}
    </section>
  );
}

