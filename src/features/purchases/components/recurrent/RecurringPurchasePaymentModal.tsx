import { useEffect, useState } from "react";
import { PaymentFlowModal } from "@/features/payments/components/PaymentFlowModal";
import { generateCurrentRecurringPayable } from "@/shared/services/recurringPurchaseService";
import type { PaymentFlowContext } from "@/features/payments/types/payment-contract.types";
import type { RecurringPurchase } from "../../types/recurring-purchase.types";
import { useFeedbackToast } from "@/shared/hooks/useFeedbackToast";
import { errorResponse } from "@/shared/common/utils/response";

type Props = {
  open: boolean;
  item: RecurringPurchase | null;
  onClose: () => void;
  onSaved: () => void;
  canUploadEvidence?: boolean;
};

/** Resolves the current recurring obligation, then delegates capture to payments. */
export function RecurringPurchasePaymentModal({ open, item, onClose, onSaved }: Props) {
  const [context, setContext] = useState<PaymentFlowContext | null>(null);
  const [loading, setLoading] = useState(false);
  const { showFeedback } = useFeedbackToast();

  useEffect(() => {
    if (!open || !item) {
      setContext(null);
      return;
    }

    let alive = true;
    setLoading(true);
    generateCurrentRecurringPayable(item.recurringPurchaseTemplateId)
      .then((result) => {
        if (!alive || !result.purchaseId || !result.accountPayableId) return;
        setContext({
          source: "RECURRING",
          mode: "IMMEDIATE",
          purchaseId: result.purchaseId,
          accountPayableId: result.accountPayableId,
          supplierId: item.supplierId,
          currency: item.currency,
          suggestedAmount: item.amount,
          lockObligation: true,
        });
      })
      .catch(() => {
        if (alive) showFeedback(errorResponse("No se pudo generar la obligación recurrente."));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [
    open,
    item?.recurringPurchaseTemplateId,
    item?.supplierId,
    item?.currency,
    item?.amount,
    showFeedback,
  ]);

  if (!open || !item || loading || !context) return null;

  return (
    <PaymentFlowModal
      open
      context={context}
      onClose={onClose}
      onSaved={onSaved}
    />
  );
}
