import { formatPaymentAmount } from "../utils/paymentFormatters";
import type { PaymentRecord } from "../types/payment.types";

type Props = {
  payments: PaymentRecord[];
};

function sumAmount(payments: PaymentRecord[]) {
  return payments.reduce((total, payment) => {
    const value = Number(payment.amount ?? 0);
    return Number.isFinite(value) ? total + value : total;
  }, 0);
}

export function PaymentKpiStrip({ payments }: Props) {
  const pendingPayments = payments.filter((payment) => payment.status === "PENDING_APPROVAL");
  const scheduledPayments = payments.filter((payment) => payment.status === "SCHEDULED");
  const approvedPayments = payments.filter((payment) => payment.status === "APPROVED");
  const withoutEvidence = payments.filter((payment) => !payment.paymentEvidenceFileId);

  const items = [
    {
      label: "Por aprobar",
      value: String(pendingPayments.length),
      amount: formatPaymentAmount(sumAmount(pendingPayments), pendingPayments[0]?.currency ?? "PEN"),
    },
    {
      label: "Programados",
      value: String(scheduledPayments.length),
      amount: formatPaymentAmount(sumAmount(scheduledPayments), scheduledPayments[0]?.currency ?? "PEN"),
    },
    {
      label: "Aprobados",
      value: String(approvedPayments.length),
      amount: formatPaymentAmount(sumAmount(approvedPayments), approvedPayments[0]?.currency ?? "PEN"),
    },
    {
      label: "Sin evidencia",
      value: String(withoutEvidence.length),
      amount: "Revisar comprobantes",
    },
  ];

  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="rounded-sm border border-border/70 bg-background px-3 py-2 shadow-sm">
          <p className="text-[11px] font-semibold uppercase text-muted-foreground">{item.label}</p>
          <div className="mt-1 flex items-end justify-between gap-3">
            <span className="text-lg font-semibold text-foreground">{item.value}</span>
            <span className="truncate text-xs text-muted-foreground">{item.amount}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
