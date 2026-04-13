// src/hooks/useWarehouses.ts
import { useCallback, useEffect, useState } from "react";
import type { CreateWarehouseDto, ListWarehousesQuery, UpdateWarehouseActiveDto, UpdateWarehouseDto, Warehouse, WarehouseListResponse, WarehouseLocationsResponse } from "@/pages/warehouse/types/warehouse";
import { createWarehouse, listWarehouses, updateWarehouse, updateWarehouseActive, getLocationsById } from "@/services/warehouseServices";

export function useWarehouses(params: ListWarehousesQuery) {
  const [items, setItems] = useState<Warehouse[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      console.log("[Warehouses search] request", params);
      const res: WarehouseListResponse = await listWarehouses(params);
      setItems(res.items ?? []);
      setTotal(res.total ?? 0);
      setPage(res.page ?? params.page ?? 1);
      setLimit(res.limit ?? params.limit ?? 10);
      console.log("[Warehouses search] response", {
        q: params.q ?? "",
        page: res.page ?? params.page ?? 1,
        limit: res.limit ?? params.limit ?? 10,
        total: res.total ?? 0,
        items: res.items?.length ?? 0,
      });
    } catch (e: any) {
      setItems([]);
      setTotal(0);
      console.log("[Warehouses search] error", {
        q: params.q ?? "",
        page: params.page ?? 1,
        limit: params.limit ?? 10,
      });
      setError(e?.response?.data?.message ?? "No se pudieron cargar los almacenes.");
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const create = useCallback(async (payload: CreateWarehouseDto) => {
    await createWarehouse(payload);
    await fetchList();
  }, [fetchList]);

  const update = useCallback(async (id: string, payload: UpdateWarehouseDto) => {
    await updateWarehouse(id, payload);
    await fetchList();
  }, [fetchList]);
  
  const getLocations = useCallback(async (id: string): Promise<WarehouseLocationsResponse> => {
    return getLocationsById(id);
  }, [fetchList]);

  const setActive = useCallback(async (id: string, isActive: boolean) => {
    const payload: UpdateWarehouseActiveDto = { isActive };
    await updateWarehouseActive(id, payload);
    await fetchList();
  }, [fetchList]);

  return { items, total, page, limit, loading, error, create, update, setActive, refetch: fetchList, getLocations };
}


