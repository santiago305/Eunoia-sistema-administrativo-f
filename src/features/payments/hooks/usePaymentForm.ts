import { useCallback, useState } from "react";
import type { PaymentContract } from "../types/payment-contract.types";

export function usePaymentForm(initial: Partial<PaymentContract> = {}) {
  const [values, setValues] = useState<Partial<PaymentContract>>(initial);
  const update = useCallback(<K extends keyof PaymentContract>(field: K, value: PaymentContract[K]) => {
    setValues((current) => ({ ...current, [field]: value }));
  }, []);
  const reset = useCallback(() => setValues(initial), [initial]);
  return { values, update, reset };
}
