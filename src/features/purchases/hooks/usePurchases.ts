import { useCallback, useEffect, useState } from "react";
import { listPurchaseOrders } from "@/shared/services/purchaseService";
import type { ListPurchaseOrdersQuery, PurchaseOrder, PurchaseOrderListResponse } from "@/features/purchases/types/purchase";

type UsePurchasesParams = Partial<ListPurchaseOrdersQuery>;

const defaultResponse: PurchaseOrderListResponse = {
  items: [],
  total: 0,
  page: 1,
  limit: 20,
};

export function usePurchases(params: UsePurchasesParams = {}) {
  const [response, setResponse] = useState<PurchaseOrderListResponse>(defaultResponse);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query = {
        page: params.page ?? 1,
        limit: params.limit ?? 20,
        q: params.q,
        filters: params.filters,
        from: params.from,
        to: params.to,
      } as ListPurchaseOrdersQuery;
      setResponse(await listPurchaseOrders(query));
    } catch (requestError) {
      setResponse(defaultResponse);
      setError(requestError);
    } finally {
      setLoading(false);
    }
  }, [params.filters, params.from, params.limit, params.page, params.q, params.to]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { ...response, purchases: response.items as PurchaseOrder[], loading, error, reload };
}
