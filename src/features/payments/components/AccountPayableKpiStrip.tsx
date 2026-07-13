import type { AccountPayable } from "../types/payable.types";
import { formatPaymentAmount } from "../utils/paymentFormatters";

type Props = {
  payables: AccountPayable[];
};

function sumBy(payables: AccountPayable[], selector: (payable: AccountPayable) => number) {
  return payables.reduce((total, payable) => {
    const value = Number(selector(payable) ?? 0);
    return Number.isFinite(value) ? total + value : total;
  }, 0);
}

function isDueSoon(value?: string | null) {
  if (!value) return false;
  const dueDate = new Date(value);
  if (Number.isNaN(dueDate.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const limit = new Date(today);
  limit.setDate(limit.getDate() + 7);
  return dueDate >= today && dueDate <= limit;
}

function isThisMonth(value?: string | null) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const today = new Date();
  return date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth();
}

export function AccountPayableKpiStrip({ payables }: Props) {
  const currency = payables[0]?.currency ?? "PEN";
  const openPayables = payables.filter((payable) => payable.status !== "PAID" && payable.status !== "CANCELLED");
  const overduePayables = payables.filter((payable) => payable.status === "OVERDUE");
  const dueSoonPayables = openPayables.filter((payable) => isDueSoon(payable.dueDate));
  const paidThisMonth = payables.filter((payable) => payable.status === "PAID" && isThisMonth(payable.updatedAt ?? payable.createdAt));

  const items = [
    {
      label: "Pendiente total",
      value: formatPaymentAmount(sumBy(openPayables, (payable) => payable.amountPending), currency),
      detail: `${openPayables.length} obligacion(es) abiertas`,
    },
    {
      label: "Vencido total",
      value: formatPaymentAmount(sumBy(overduePayables, (payable) => payable.amountPending), currency),
      detail: `${overduePayables.length} vencida(s)`,
    },
    {
      label: "Por vencer 7 dias",
      value: formatPaymentAmount(sumBy(dueSoonPayables, (payable) => payable.amountPending), currency),
      detail: `${dueSoonPayables.length} compromiso(s)`,
    },
    {
      label: "Pagado del mes",
      value: formatPaymentAmount(sumBy(paidThisMonth, (payable) => payable.amountPaid), currency),
      detail: `${paidThisMonth.length} cerrada(s)`,
    },
  ];

  return (
    <section className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4" aria-label="Indicadores de cuentas por pagar">
      {items.map((item) => (
        <div key={item.label} className="rounded-sm border border-border/70 bg-background px-3 py-2 shadow-sm">
          <p className="text-[11px] font-semibold uppercase text-muted-foreground">{item.label}</p>
          <div className="mt-1 flex items-end justify-between gap-3">
            <span className="truncate text-lg font-semibold text-foreground">{item.value}</span>
            <span className="truncate text-xs text-muted-foreground">{item.detail}</span>
          </div>
        </div>
      ))}
    </section>
  );
}
