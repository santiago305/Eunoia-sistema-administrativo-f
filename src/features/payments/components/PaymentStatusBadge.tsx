import { getPaymentStatusView } from "../paymentView";
import type { PaymentRecord } from "../types/payment.types";

type Props = {
  status?: PaymentRecord["status"];
};

export function PaymentStatusBadge({ status }: Props) {
  const view = getPaymentStatusView(status);

  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${view.className}`}>
      {view.label}
    </span>
  );
}
