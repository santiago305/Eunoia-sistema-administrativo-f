import { PaymentFormModal, type PaymentFormInitialPayment } from "./PaymentFormModal";
import type { PaymentFlowContext } from "../types/payment-contract.types";

type Props = {
  open: boolean;
  context: PaymentFlowContext;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
};

/** Canonical payment entry point. Consumers provide business context, never form state. */
export function PaymentFlowModal({ open, context, onClose, onSaved }: Props) {
  const initialPayment: PaymentFormInitialPayment = {
    poId: context.purchaseId,
    accountPayableId: context.accountPayableId,
    quotaId: context.quotaId,
    supplierId: context.supplierId,
    currency: context.currency,
    amount: context.suggestedAmount,
  };

  return (
    <PaymentFormModal
      open={open}
      mode={context.mode === "SCHEDULED" ? "schedule" : "create"}
      onClose={onClose}
      onSaved={onSaved}
      initialPayment={initialPayment}
    />
  );
}
