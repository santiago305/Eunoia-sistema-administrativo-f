import { PaymentFlowModal } from "@/features/payments/components/PaymentFlowModal";
import type { CurrencyType } from "@/features/purchases/types/purchaseEnums";

export type PaymentProps = {
  title: string;
  close: () => void;
  className?: string;
  totalToPay?: number;
  totalPaid?: number;
  quotaId?: string;
  poId: string;
  currency?: CurrencyType;
  supplierId?: string;
  loadPurchases?: () => void;
  loadQuotas?: () => void;
  onSaved?: () => void | Promise<void>;
  open: boolean;
};

/** Compatibility adapter: purchase and quota screens use the payments-owned flow. */
export function PaymentModal({
  close,
  totalToPay = 0,
  quotaId,
  poId,
  currency,
  supplierId,
  loadPurchases,
  loadQuotas,
  onSaved,
  open,
}: PaymentProps) {
  return (
    <PaymentFlowModal
      open={open}
      context={{
        source: quotaId ? "QUOTA" : "PURCHASE",
        mode: "IMMEDIATE",
        purchaseId: poId,
        quotaId,
        supplierId,
        currency,
        suggestedAmount: totalToPay,
        lockObligation: true,
      }}
      onClose={close}
      onSaved={async () => {
        loadPurchases?.();
        loadQuotas?.();
        await onSaved?.();
      }}
    />
  );
}
