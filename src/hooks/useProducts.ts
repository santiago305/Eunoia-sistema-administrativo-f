import { useCallback, useEffect, useMemo, useState } from "react";
import type { AxiosError } from "axios";
import type { CreateProductDto, ListProductsQuery, Product, UpdateProductDto } from "@/types/product";
import {
  createProduct,
  getProductByName,
  listProducts,
  updateProduct,
  updateProductActive,
} from "@/services/productService";

type ProductsState = {
  items: Product[];
  total: number;
  page: number;
  limit: number;
};

const buildQuery = (params: ListProductsQuery) => {
  const query: ListProductsQuery = { ...params };
  if (!query.q) delete query.q;
  if (!query.name) delete query.name;
  if (!query.description) delete query.description;
  return query;
};

export function useProducts(params: ListProductsQuery & { exactName?: string }) {
  const [state, setState] = useState<ProductsState>({
    items: [],
    total: 0,
    page: params.page ?? 1,
    limit: params.limit ?? 25,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const query = useMemo(() => buildQuery(params), [params]);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (params.exactName && params.exactName.trim()) {
        try {
          const res = await getProductByName(params.exactName.trim());
          setState({
            items: res.items ?? [],
            total: res.total ?? 0,
            page: res.page ?? 1,
            limit: res.limit ?? 10,
          });
        } catch (err) {
          const status = (err as AxiosError)?.response?.status;
          if (status === 404) {
            setState({
              items: [],
              total: 0,
              page: 1,
              limit: 10,
            });
          } else {
            throw err;
          }
        }
      } else {
        const res = await listProducts(query);
        setState({
          items: res.items ?? [],
          total: res.total ?? 0,
          page: res.page ?? query.page ?? 1,
          limit: res.limit ?? query.limit ?? 25,
        });
      }
    } catch {
      setError("Error al cargar productos.");
      setState((prev) => ({ ...prev, items: [], total: 0 }));
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    void fetchProducts();
  }, [fetchProducts]);

  const create = useCallback(
    async (payload: CreateProductDto) => {
      await createProduct(payload);
      await fetchProducts();
    },
    [fetchProducts]
  );

  const update = useCallback(
    async (id: string, payload: UpdateProductDto) => {
      await updateProduct(id, payload);
      await fetchProducts();
    },
    [fetchProducts]
  );

  const setActive = useCallback(
    async (id: string, isActive: boolean) => {
      await updateProductActive(id, { isActive });
      await fetchProducts();
    },
    [fetchProducts]
  );

  return {
    items: state.items,
    total: state.total,
    page: state.page,
    limit: state.limit,
    loading,
    error,
    refresh: fetchProducts,
    create,
    update,
    setActive,
  };
}
