import { useCallback, useEffect, useState } from "react";
import { getPurchaseTimeline } from "@/shared/services/purchaseService";

type PurchaseTimelineEvent = Record<string, unknown>;

export function usePurchaseTimeline(purchaseId?: string) {
  const [events, setEvents] = useState<PurchaseTimelineEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const reload = useCallback(async () => {
    if (!purchaseId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await getPurchaseTimeline(purchaseId);
      setEvents(response.events ?? []);
    } catch (requestError) {
      setEvents([]);
      setError(requestError);
    } finally {
      setLoading(false);
    }
  }, [purchaseId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { events, loading, error, reload };
}
