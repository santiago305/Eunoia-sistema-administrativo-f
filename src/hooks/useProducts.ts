import { useCallback, useEffect, useMemo, useState } from "react";
import type { CreateProductDto, ListProductsQuery, Product, UpdateProductDto } from "@/pages/catalog/types/product";
import {
  createProduct,
  listCatalogMaterials,
  listCatalogProducts,
  listProductsFlat,
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

const buildQuery = (params: ListProductsQuery & { name?: string }) => {
  const query: ListProductsQuery = { ...params };

  if (params.name && params.name.trim()) {
    query.name = params.name.trim();
  }

  if (!query.q) delete query.q;
  if (!query.type) delete query.type;
  if (!query.name) delete query.name;
  if (!query.description) delete query.description;

  return query;
};


type UseProductsOptions = {
  flat?: boolean;
  mode?: "default" | "product" | "material";
};

export function useProducts(
  params: ListProductsQuery & { name?: string },
  options?: UseProductsOptions
) {
  const [state, setState] = useState<ProductsState>({
    items: [],
    total: 0,
    page: params.page ?? 1,
    limit: params.limit ?? 25,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const useFlatList = options?.flat ?? false;
  const mode = options?.mode ?? "default";

  const query = useMemo(() => buildQuery(params), [params]);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res =
        mode === "product"
          ? await listCatalogProducts(query)
          : mode === "material"
            ? await listCatalogMaterials(query)
            : useFlatList
              ? await listProductsFlat(query)
              : await listProducts(query);
      setState({
        items: res.items ?? [],
        total: res.total ?? 0,
        page: Number(res.page ?? query.page ?? 1),
        limit: Number(res.limit ?? query.limit ?? 25),
      });
    } catch {
      setError("Error al cargar productos.");
      setState((prev) => ({ ...prev, items: [], total: 0 }));
    } finally {
      setLoading(false);
    }
  }, [mode, query, useFlatList]);

  useEffect(() => {
    void fetchProducts();
  }, [fetchProducts]);

  const create = useCallback(
    async (payload: CreateProductDto) => {
      await createProduct(payload);
      // After create, force first page so the newest item is visible
      setLoading(true);
      setError(null);
      try {
        const res =
          mode === "product"
            ? await listCatalogProducts({ ...query, page: 1 })
            : mode === "material"
              ? await listCatalogMaterials({ ...query, page: 1 })
              : useFlatList
                ? await listProductsFlat({ ...query, page: 1 })
                : await listProducts({ ...query, page: 1 });
        setState({
          items: res.items ?? [],
          total: res.total ?? 0,
          page: Number(res.page ?? 1),
          limit: Number(res.limit ?? query.limit ?? 25),
        });
      } catch {
        setError("Error al cargar productos.");
        setState((prev) => ({ ...prev, items: [], total: 0 }));
      } finally {
        setLoading(false);
      }
    },
    [mode, query, useFlatList]
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


