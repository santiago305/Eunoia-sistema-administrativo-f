import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  CreatePaymentMethodDto,
  ListPaymentMethodsQuery,
  PaymentMethod,
  PaymentMethodListResponse,
  UpdatePaymentMethodDto,
} from "@/features/payment-methods/types/paymentMethod";
import {
  createPaymentMethod,
  listPaymentMethods,
  setPaymentMethodActive,
  updatePaymentMethod,
} from "@/shared/services/paymentMethodService";

type PaymentMethodsState = {
  items: PaymentMethod[];
  total: number;
  page: number;
  limit: number;
};

const buildQuery = (params: ListPaymentMethodsQuery & { name?: string }) => {
  const query: ListPaymentMethodsQuery = { ...params };

  if (params.name && params.name.trim()) {
    query.name = params.name.trim();
  }

  if (!query.name) delete query.name;

  return query;
};

export function usePaymentMethods(params: ListPaymentMethodsQuery & { name?: string }) {
  const [state, setState] = useState<PaymentMethodsState>({
    items: [],
    total: 0,
    page: params.page ?? 1,
    limit: params.limit ?? 20,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const query = useMemo(() => buildQuery(params), [params]);

  const fetchPaymentMethods = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res: PaymentMethodListResponse = await listPaymentMethods(query);
      setState({
        items: res.items ?? [],
        total: res.total ?? 0,
        page: res.page ?? query.page ?? 1,
        limit: res.limit ?? query.limit ?? 20,
      });
    } catch (e: any) {
      setError(e?.response?.data?.message ?? "Error al cargar los m\u00e9todos de pago.");
      setState((prev) => ({ ...prev, items: [], total: 0 }));
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    void fetchPaymentMethods();
  }, [fetchPaymentMethods]);

  const create = useCallback(
    async (payload: CreatePaymentMethodDto) => {
      await createPaymentMethod(payload);
      await fetchPaymentMethods();
    },
    [fetchPaymentMethods],
  );

  const update = useCallback(
    async (id: string, payload: UpdatePaymentMethodDto) => {
      await updatePaymentMethod(id, payload);
      await fetchPaymentMethods();
    },
    [fetchPaymentMethods],
  );

  const setActive = useCallback(
    async (id: string, isActive: boolean) => {
      await setPaymentMethodActive(id, { isActive });
      await fetchPaymentMethods();
    },
    [fetchPaymentMethods],
  );

  return {
    items: state.items,
    total: state.total,
    page: state.page,
    limit: state.limit,
    loading,
    error,
    refresh: fetchPaymentMethods,
    create,
    update,
    setActive,
  };
}
