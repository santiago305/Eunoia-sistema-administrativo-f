import { useCallback, useEffect, useState } from "react";
import { listPayments } from "@/shared/services/purchaseService";
import type { Payment } from "@/features/purchases/types/purchase";

export function usePurchasePayments(purchaseId?: string) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const reload = useCallback(async () => {
    if (!purchaseId) return;
    setLoading(true);
    setError(null);
    try {
      setPayments(await listPayments(purchaseId));
    } catch (requestError) {
      setPayments([]);
      setError(requestError);
    } finally {
      setLoading(false);
    }
  }, [purchaseId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { payments, loading, error, reload };
}
