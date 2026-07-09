import { useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { PageShell } from "@/shared/layouts/PageShell";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { usePurchaseDashboard } from "@/features/purchases/hooks/usePurchaseDashboard";
import { PurchaseKpiGrid } from "@/features/purchases/components/dashboard/PurchaseKpiGrid";
import { PurchaseSpendingChart } from "@/features/purchases/components/dashboard/PurchaseSpendingChart";
import { PurchaseTypeChart } from "@/features/purchases/components/dashboard/PurchaseTypeChart";
import { PurchasePaymentStatusChart } from "@/features/purchases/components/dashboard/PurchasePaymentStatusChart";
import { UpcomingPaymentsTable } from "@/features/purchases/components/dashboard/UpcomingPaymentsTable";
import { OverduePaymentsTable } from "@/features/purchases/components/dashboard/OverduePaymentsTable";
import { PurchaseDashboardRankingTable } from "@/features/purchases/components/dashboard/PurchaseDashboardRankingTable";
import { PurchaseDashboardFilters } from "@/features/purchases/components/dashboard/PurchaseDashboardFilters";
import { DEFAULT_PURCHASE_DASHBOARD_LIMIT } from "@/features/purchases/components/dashboard/PurchaseDashboardLimitSelect";
import type {
  PurchaseDashboardFilters as PurchaseDashboardFilterValue,
  PurchaseDashboardSeriesPoint,
} from "@/features/purchases/types/purchase-dashboard.types";
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
  const [draftFilters, setDraftFilters] = useState<PurchaseDashboardFilterValue>(defaultFilters);
  const [appliedFilters, setAppliedFilters] = useState<PurchaseDashboardFilterValue>(defaultFilters);
  const { data, loading, error, reload } = usePurchaseDashboard(appliedFilters);

  const activeFilterCount = useMemo(
    () => Object.entries(appliedFilters).filter(([key, value]) => key !== "limit" && Boolean(value)).length,
    [appliedFilters],
  );

  const applyFilters = () => setAppliedFilters({ ...draftFilters });
  const clearFilters = () => {
    setDraftFilters(defaultFilters);
    setAppliedFilters(defaultFilters);
  };
  const currentLimit = appliedFilters.limit ?? DEFAULT_PURCHASE_DASHBOARD_LIMIT;

  return (
    <PageShell className="bg-white">
      <div className="space-y-5">
        <header className="flex flex-col gap-3 border-b border-black/10 pb-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {activeFilterCount ? (
              <span className="rounded-md border border-black/10 px-3 py-2 text-xs text-black/65">
                {activeFilterCount} filtros activos
              </span>
            ) : null}
            <SystemButton size="sm" variant="outline" leftIcon={<RefreshCw className="h-4 w-4" />} onClick={reload} disabled={loading}>
              Actualizar
            </SystemButton>
          </div>
        </header>

        <PurchaseDashboardFilters
          value={draftFilters}
          loading={loading}
          onChange={setDraftFilters}
          onApply={applyFilters}
          onClear={clearFilters}
        />

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
