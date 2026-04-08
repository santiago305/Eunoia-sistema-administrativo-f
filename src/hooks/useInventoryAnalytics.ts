import { useCallback, useEffect, useState } from "react";
import type {
  DemandSummaryOutput,
  DemandSummaryQuery,
  SalesDailyTotal,
  SalesMonthlyTotal,
  SalesTotalsQuery,
  SalesWeekdayTotal,
} from "@/pages/catalog/types/inventory";
import {
  getDailySalesTotals,
  getDemandSummary,
  getSalesMonthlyTotals,
  getSalesWeekdayTotals,
} from "@/services/kardexService";

type InventoryAnalyticsParams = {
  warehouseId?: string;
  stockItemId?: string | null;
  locationId?: string;
  from?: string;
  to?: string;
  windowDays?: number;
  horizonDays?: number;
  enabled?: boolean;
};

export function useInventoryAnalytics({
  warehouseId,
  stockItemId,
  locationId,
  from,
  to,
  windowDays = 7,
  horizonDays = 7,
  enabled = true,
}: InventoryAnalyticsParams) {
  const [dailySales, setDailySales] = useState<SalesDailyTotal[]>([]);
  const [weeklySales, setWeeklySales] = useState<SalesWeekdayTotal[]>([]);
  const [monthlySales, setMonthlySales] = useState<SalesMonthlyTotal[]>([]);
  const [demand, setDemand] = useState<DemandSummaryOutput | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    if (!enabled) {
      setDailySales([]);
      setWeeklySales([]);
      setMonthlySales([]);
      setDemand(null);
      return;
    }

    const common: SalesTotalsQuery = {
      ...(warehouseId ? { warehouseId } : {}),
      ...(stockItemId ? { stockItemId } : {}),
      ...(locationId ? { locationId } : {}),
      ...(from ? { from } : {}),
      ...(to ? { to } : {}),
    };

    const demandQuery: DemandSummaryQuery = {
      ...common,
      windowDays,
      horizonDays,
    };

    setLoading(true);
    setError(null);
    try {
      const [daily, week, month, demandResult] = await Promise.all([
        getDailySalesTotals(common),
        getSalesWeekdayTotals(common),
        getSalesMonthlyTotals(common),
        getDemandSummary(demandQuery),
      ]);

      setDailySales(daily ?? []);
      setWeeklySales(week ?? []);
      setMonthlySales(month ?? []);
      setDemand(demandResult ?? null);
    } catch (err: any) {
      setDailySales([]);
      setWeeklySales([]);
      setMonthlySales([]);
      setDemand(null);
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
    windowDays,
    horizonDays,
  ]);

  useEffect(() => {
    void fetchAnalytics();
  }, [fetchAnalytics]);

  return {
    dailySales,
    weeklySales,
    monthlySales,
    demand,
    loading,
    error,
    refetch: fetchAnalytics,
  };
}
