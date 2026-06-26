import { useCallback, useEffect, useState } from "react";
import { getById } from "@/shared/services/purchaseService";
import type { PurchaseOrderDetailOutput } from "@/features/purchases/types/itemPurchaseEdit";

export function usePurchaseDetail(purchaseId?: string) {
  const [detail, setDetail] = useState<PurchaseOrderDetailOutput | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const reload = useCallback(async () => {
    if (!purchaseId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await getById(purchaseId);
      setDetail(response);
    } catch (requestError) {
      setDetail(null);
      setError(requestError);
    } finally {
      setLoading(false);
    }
  }, [purchaseId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { detail, loading, error, reload };
}
