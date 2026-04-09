import { useCallback, useEffect, useState } from "react";
import type {
  MonthlyProjectionOutput,
  SalesDailyTotal,
  SalesTotalsQuery,
} from "@/pages/catalog/types/inventory";
import {
  getDailySalesTotals,
  getMonthlyProjection,
} from "@/services/kardexService";

const parseDateOnly = (value?: string) => {
  if (!value) return null;
  const match = value.match(/^\d{4}-\d{2}-\d{2}/);
  if (!match) return null;
  const date = new Date(`${match[0]}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return date;
};

const formatDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;

type InventoryAnalyticsParams = {
  warehouseId?: string;
  stockItemId?: string | null;
  locationId?: string;
  from?: string;
  to?: string;
  month?: string;
  enabled?: boolean;
  demandEnabled?: boolean;
  projectionMonths?: number;
};

export function useInventoryAnalytics({
  warehouseId,
  stockItemId,
  locationId,
  from,
  to,
  month,
  enabled = true,
  demandEnabled = true,
  projectionMonths = 5,
}: InventoryAnalyticsParams) {
  const [dailySales, setDailySales] = useState<SalesDailyTotal[]>([]);
  const [monthlyProjection, setMonthlyProjection] = useState<MonthlyProjectionOutput | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    if (!enabled) {
      setDailySales([]);
      setMonthlyProjection(null);
      return;
    }

    if (!demandEnabled) {
      setMonthlyProjection(null);
    }

    const projectionTo = (() => {
      if (!to) return undefined;
      const parsed = parseDateOnly(to);
      if (!parsed) return to;
      const now = new Date();
      if (
        parsed.getFullYear() === now.getFullYear() &&
        parsed.getMonth() === now.getMonth()
      ) {
        const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
        return formatDate(prevMonthEnd);
      }
      return to;
    })();

    const monthlyQuery: SalesTotalsQuery & { months?: number } = {
      ...(warehouseId ? { warehouseId } : {}),
      ...(stockItemId ? { stockItemId } : {}),
      ...(locationId ? { locationId } : {}),
      ...(projectionTo ? { to: projectionTo } : {}),
      months: projectionMonths,
    };

    setLoading(true);
    setError(null);
    try {
      const dailyQuery: SalesTotalsQuery = {
        ...(warehouseId ? { warehouseId } : {}),
        ...(stockItemId ? { stockItemId } : {}),
        ...(locationId ? { locationId } : {}),
        ...(!month && from ? { from } : {}),
        ...(!month && to ? { to } : {}),
        ...(month ? { month } : {}),
      };

      const [daily, projectionResult] = await Promise.all([
        getDailySalesTotals(dailyQuery),
        demandEnabled ? getMonthlyProjection(monthlyQuery) : Promise.resolve(null),
      ]);

      setDailySales(daily ?? []);
      setMonthlyProjection(projectionResult ?? null);
    } catch (err: any) {
      setDailySales([]);
      setMonthlyProjection(null);
      setError(err?.response?.data?.message ?? "Error al cargar analítica.");
    } finally {
      setLoading(false);
    }
  }, [
    enabled,
    warehouseId,
    stockItemId,
    locationId,
    from,
    to,
    month,
    demandEnabled,
    projectionMonths,
  ]);

  useEffect(() => {
    void fetchAnalytics();
  }, [fetchAnalytics]);

  return {
    dailySales,
    monthlyProjection,
    loading,
    error,
    refetch: fetchAnalytics,
  };
}
