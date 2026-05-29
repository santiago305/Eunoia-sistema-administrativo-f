import { useEffect, useMemo, useRef, useState } from "react";
import { saleOrdersApi } from "@/api/saleOrdersApi";
import type { Rule, SaleOrderRow, SearchState } from "@/modules/sale-orders/types";

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const handle = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(handle);
  }, [delayMs, value]);
  return debounced;
}

export function useSaleOrdersSearchState() {
  const [data, setData] = useState<SearchState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await saleOrdersApi.getSaleOrdersSearchState();
      setData(res as unknown as SearchState);
    } catch {
      setError("No se pudo cargar el estado de búsqueda.");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { data, loading, error, refresh, setData };
}

export function useSaleOrdersList(params: {
  q?: string;
  page?: number;
  limit?: number;
  rules?: Rule[];
}) {
  const { q, page = 1, limit = 10, rules = [] } = params;
  const debouncedQ = useDebouncedValue(q ?? "", 300);

  const [items, setItems] = useState<SaleOrderRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestKey = useMemo(() => JSON.stringify({ q: debouncedQ, page, limit, rules }), [debouncedQ, limit, page, rules]);
  const lastKeyRef = useRef<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await saleOrdersApi.listSaleOrders({
        q: debouncedQ || undefined,
        page,
        limit,
        filters: rules,
      });
      setItems((res.items ?? []) as unknown as SaleOrderRow[]);
      setTotal(res.total ?? 0);
    } catch {
      setItems([]);
      setTotal(0);
      setError("No se pudo listar pedidos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (lastKeyRef.current === requestKey) return;
    lastKeyRef.current = requestKey;
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey]);

  return { items, total, loading, error, refresh };
}

