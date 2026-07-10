import { useCallback, useEffect, useMemo, useState } from "react";
import { sileo } from "sileo";
import { PageShell } from "@/shared/layouts/PageShell";
import { usePurchaseDashboard } from "@/features/purchases/hooks/usePurchaseDashboard";
import type { DataTableRecentSearchItem, DataTableSavedSearchItem } from "@/shared/components/table/search";
import {
  deletePurchaseDashboardSearchMetric,
  getPurchaseDashboardSearchState,
  savePurchaseDashboardSearchMetric,
} from "@/shared/services/purchaseDashboardService";
import { PurchaseKpiGrid } from "@/features/purchases/components/dashboard/PurchaseKpiGrid";
import { PurchaseSpendingChart } from "@/features/purchases/components/dashboard/PurchaseSpendingChart";
import { PurchaseTypeChart } from "@/features/purchases/components/dashboard/PurchaseTypeChart";
import { PurchasePaymentStatusChart } from "@/features/purchases/components/dashboard/PurchasePaymentStatusChart";
import { UpcomingPaymentsTable } from "@/features/purchases/components/dashboard/UpcomingPaymentsTable";
import { OverduePaymentsTable } from "@/features/purchases/components/dashboard/OverduePaymentsTable";
import { PurchaseDashboardRankingTable } from "@/features/purchases/components/dashboard/PurchaseDashboardRankingTable";
import { PurchaseDashboardFilters } from "@/features/purchases/components/dashboard/PurchaseDashboardFilters";
import type {
  PurchaseDashboardFilters as PurchaseDashboardFilterValue,
  PurchaseDashboardSavedFilterSnapshot,
  PurchaseDashboardSearchStateResponse,
  PurchaseDashboardSeriesPoint,
} from "@/features/purchases/types/purchase-dashboard.types";
import { DEFAULT_PURCHASE_DASHBOARD_LIMIT } from "@/features/purchases/types/purchase-dashboard.types";
import {
  buildPurchaseDashboardFilterLabel,
  dashboardFiltersToSnapshot,
  hasPurchaseDashboardFilterCriteria,
  sanitizePurchaseDashboardFilterSnapshot,
  snapshotToDashboardFilters,
} from "@/features/purchases/utils/purchaseDashboardSmartFilters";
import {
  formatPurchaseDashboardItemType,
  formatPurchaseDashboardSeriesLabel,
} from "@/features/purchases/utils/purchaseDashboardLabels";

const emptySummary = {
  totalPurchased: 0,
  totalPaid: 0,
  pending: 0,
  overdue: 0,
  drafts: 0,
  toApprove: 0,
  paymentsToApprove: 0,
  received: 0,
};

export default function PurchaseDashboardPage() {
  const defaultFilters = useMemo<PurchaseDashboardFilterValue>(() => ({ limit: DEFAULT_PURCHASE_DASHBOARD_LIMIT }), []);
  const [filters, setFilters] = useState<PurchaseDashboardFilterValue>(defaultFilters);
  const [searchState, setSearchState] = useState<PurchaseDashboardSearchStateResponse | null>(null);
  const [savingMetric, setSavingMetric] = useState(false);
  const { data, loading, error, reload } = usePurchaseDashboard(filters);

  const activeFilterCount = useMemo(
    () => Object.entries(filters).filter(([key, value]) => key !== "limit" && Boolean(value)).length,
    [filters],
  );

  const currentLimit = filters.limit ?? DEFAULT_PURCHASE_DASHBOARD_LIMIT;
  const snapshot = useMemo(() => dashboardFiltersToSnapshot(filters), [filters]);

  const recentMetrics = useMemo<DataTableRecentSearchItem<PurchaseDashboardSavedFilterSnapshot>[]>(
    () =>
      (searchState?.recent ?? []).map((item) => {
        const snapshot = sanitizePurchaseDashboardFilterSnapshot(item.snapshot);
        return {
          id: item.recentId,
          label: buildPurchaseDashboardFilterLabel(snapshot),
          snapshot,
        };
      }),
    [searchState],
  );

  const savedMetrics = useMemo<DataTableSavedSearchItem<PurchaseDashboardSavedFilterSnapshot>[]>(
    () =>
      (searchState?.saved ?? []).map((metric) => ({
        id: metric.metricId,
        name: metric.name,
        label: buildPurchaseDashboardFilterLabel(metric.snapshot),
        snapshot: sanitizePurchaseDashboardFilterSnapshot(metric.snapshot),
      })),
    [searchState],
  );

  const loadSearchState = useCallback(async () => {
    try {
      const response = await getPurchaseDashboardSearchState();
      setSearchState(response);
    } catch {
      sileo.error({ title: "Error al cargar filtros guardados del dashboard" });
    }
  }, []);

  useEffect(() => {
    void loadSearchState();
  }, [loadSearchState]);

  const applySavedSnapshot = useCallback((snapshot: PurchaseDashboardSavedFilterSnapshot) => {
    const nextFilters = {
      ...snapshotToDashboardFilters(snapshot),
      limit: DEFAULT_PURCHASE_DASHBOARD_LIMIT,
    };
    setFilters(nextFilters);
  }, []);

  const saveMetric = useCallback(async (name: string) => {
    const sanitizedSnapshot = sanitizePurchaseDashboardFilterSnapshot(snapshot);
    if (!hasPurchaseDashboardFilterCriteria(sanitizedSnapshot)) return false;

    const normalizedName = name.trim();
    if (!normalizedName) return false;

    setSavingMetric(true);
    try {
      const response = await savePurchaseDashboardSearchMetric(normalizedName, sanitizedSnapshot);
      if (response.type === "success") {
        sileo.success({ title: response.message });
        await loadSearchState();
        return true;
      } else {
        sileo.error({ title: response.message });
        return false;
      }
    } catch {
      sileo.error({ title: "Error al guardar el filtro" });
      return false;
    } finally {
      setSavingMetric(false);
    }
  }, [loadSearchState, snapshot]);

  const deleteMetric = useCallback(async (metricId: string) => {
    try {
      const response = await deletePurchaseDashboardSearchMetric(metricId);
      if (response.type === "success") {
        sileo.success({ title: response.message });
        await loadSearchState();
      } else {
        sileo.error({ title: response.message });
      }
    } catch {
      sileo.error({ title: "Error al eliminar el filtro" });
    }
  }, [loadSearchState]);

  return (
    <PageShell className="bg-white">
      <div className="space-y-5">
        <div className="flex flex-nowrap items-center justify-end gap-2 border-b border-black/10 pb-4">
          {activeFilterCount ? (
            <span className="rounded-md border border-black/10 px-3 py-2 text-xs text-black/65">
              {activeFilterCount} filtros activos
            </span>
          ) : null}
          <PurchaseDashboardFilters
            value={filters}
            loading={loading}
            recentMetrics={recentMetrics}
            savedMetrics={savedMetrics}
            canSaveMetric={hasPurchaseDashboardFilterCriteria(snapshot)}
            saveLoading={savingMetric}
            onChange={setFilters}
            onRefresh={reload}
            onApplySavedSnapshot={applySavedSnapshot}
            onSaveMetric={saveMetric}
            onDeleteMetric={deleteMetric}
          />
        </div>

        {error ? <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div> : null}
        {loading ? <div className="rounded-md border border-black/10 bg-white px-4 py-6 text-sm text-black/55">Cargando métricas...</div> : null}

        <PurchaseKpiGrid summary={data?.summary ?? emptySummary} />

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)]">
          {data?.monthlySpending ? <PurchaseSpendingChart data={data.monthlySpending} /> : null}
          <PurchaseTypeChart title="Compras por tipo" description="Distribución por monto comprado." data={translateSeries(data?.byType)} />
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          <PurchasePaymentStatusChart title="Estado financiero" data={translateSeries(data?.byStatus)} />
          {data?.paymentMethodUsage ? (
            <PurchaseTypeChart title="Uso de métodos" description="Solo pagos aprobados." data={translateSeries(data.paymentMethodUsage)} />
          ) : null}
          {data?.internalVsInventory ? (
            <PurchaseTypeChart title="Inventario vs interno" description="Clasificación operativa por reglas de recepción." data={translateSeries(data.internalVsInventory)} />
          ) : null}
        </div>

        {data?.upcomingPayments || data?.overduePayments ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {data?.upcomingPayments ? <UpcomingPaymentsTable title="Próximos pagos" rows={data.upcomingPayments} limit={currentLimit} /> : null}
            {data?.overduePayments ? <OverduePaymentsTable rows={data.overduePayments} limit={currentLimit} /> : null}
          </div>
        ) : null}

        {data?.topSuppliers || data?.topItems ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {data?.topSuppliers ? (
              <PurchaseDashboardRankingTable
                title="Top proveedores"
                tableId="purchase-dashboard-top-suppliers"
                headers={["Proveedor", "Compras", "Total"]}
                limit={currentLimit}
                rows={data.topSuppliers.map((item) => ({
                  id: item.supplierId ?? item.supplierName,
                  item: item.supplierName,
                  type: String(item.count),
                  total: formatMoney(item.total),
                }))}
              />
            ) : null}
            {data?.topItems ? (
              <PurchaseDashboardRankingTable
                title="Top ítems"
                tableId="purchase-dashboard-top-items"
                limit={currentLimit}
                rows={data.topItems.map((item, index) => ({
                  id: item.itemId ?? `${item.label}-${index}`,
                  item: item.label,
                  type: formatPurchaseDashboardItemType(item.itemType),
                  total: formatMoney(item.total),
                }))}
              />
            ) : null}
          </div>
        ) : null}
      </div>
    </PageShell>
  );
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(value);
}

function translateSeries(data: PurchaseDashboardSeriesPoint[] | undefined) {
  return (data ?? []).map((item) => ({
    ...item,
    label: formatPurchaseDashboardSeriesLabel(item.label),
  }));
}
