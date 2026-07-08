import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { RefreshCw, Search, X } from "lucide-react";
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
import type { PurchaseDashboardFilters, PurchaseDashboardSeriesPoint } from "@/features/purchases/types/purchase-dashboard.types";
import {
  formatPurchaseDashboardItemType,
  formatPurchaseDashboardSeriesLabel,
} from "@/features/purchases/utils/purchaseDashboardLabels";

const purchaseTypeOptions = [
  ["", "Todos los tipos"],
  ["INVENTORY", "Inventario"],
  ["RAW_MATERIAL", "Materia prima"],
  ["INTERNAL_MATERIAL", "Material interno"],
  ["FIXED_ASSET", "Activo fijo"],
  ["SERVICE", "Servicio"],
  ["SUBSCRIPTION", "Suscripción"],
  ["MIXED", "Mixta"],
];

const paymentStatusOptions = [
  ["", "Todos los pagos"],
  ["PENDING", "Pendiente"],
  ["PARTIAL", "Parcial"],
  ["PAID", "Pagado"],
  ["OVERDUE", "Vencido"],
  ["CANCELLED", "Cancelado"],
];

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
  const [draftFilters, setDraftFilters] = useState<PurchaseDashboardFilters>({});
  const [appliedFilters, setAppliedFilters] = useState<PurchaseDashboardFilters>({});
  const { data, loading, error, reload } = usePurchaseDashboard(appliedFilters);

  const activeFilterCount = useMemo(
    () => Object.values(appliedFilters).filter(Boolean).length,
    [appliedFilters],
  );

  const updateDraft = (key: keyof PurchaseDashboardFilters, value: string) => {
    setDraftFilters((current) => ({
      ...current,
      [key]: value || undefined,
    }));
  };

  const applyFilters = () => setAppliedFilters({ ...draftFilters });
  const clearFilters = () => {
    setDraftFilters({});
    setAppliedFilters({});
  };

  return (
    <PageShell className="bg-white">
      <div className="space-y-5">
        <header className="flex flex-col gap-3 border-b border-black/10 pb-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-black">Dashboard de compras</h1>
            <p className="mt-1 max-w-3xl text-sm text-black/60">
              Vista gerencial de compras, pagos aprobados, vencimientos, proveedores, tipos y cuentas usadas.
            </p>
          </div>
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

        <section className="rounded-md border border-black/10 bg-white p-4" aria-label="Filtros del dashboard">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Field label="Desde">
              <input type="date" value={draftFilters.from ?? ""} onChange={(event) => updateDraft("from", event.target.value)} className={inputClass} />
            </Field>
            <Field label="Hasta">
              <input type="date" value={draftFilters.to ?? ""} onChange={(event) => updateDraft("to", event.target.value)} className={inputClass} />
            </Field>
            <Field label="Tipo de compra">
              <select value={draftFilters.purchaseType ?? ""} onChange={(event) => updateDraft("purchaseType", event.target.value)} className={inputClass}>
                {purchaseTypeOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </Field>
            <Field label="Estado de pago">
              <select value={draftFilters.paymentStatus ?? ""} onChange={(event) => updateDraft("paymentStatus", event.target.value)} className={inputClass}>
                {paymentStatusOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </Field>
            <Field label="Proveedor">
              <input value={draftFilters.supplierId ?? ""} onChange={(event) => updateDraft("supplierId", event.target.value)} className={inputClass} placeholder="UUID proveedor" />
            </Field>
            <Field label="Usuario">
              <input value={draftFilters.userId ?? ""} onChange={(event) => updateDraft("userId", event.target.value)} className={inputClass} placeholder="UUID usuario" />
            </Field>
            <Field label="Almacén">
              <input value={draftFilters.warehouseId ?? ""} onChange={(event) => updateDraft("warehouseId", event.target.value)} className={inputClass} placeholder="UUID almacén" />
            </Field>
            <Field label="Método de pago">
              <input value={draftFilters.paymentMethodId ?? ""} onChange={(event) => updateDraft("paymentMethodId", event.target.value)} className={inputClass} placeholder="UUID método" />
            </Field>
            <Field label="Cuenta o tarjeta">
              <input value={draftFilters.companyPaymentAccountId ?? ""} onChange={(event) => updateDraft("companyPaymentAccountId", event.target.value)} className={inputClass} placeholder="UUID cuenta" />
            </Field>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <SystemButton size="sm" leftIcon={<Search className="h-4 w-4" />} onClick={applyFilters} disabled={loading}>
              Aplicar filtros
            </SystemButton>
            <SystemButton size="sm" variant="outline" leftIcon={<X className="h-4 w-4" />} onClick={clearFilters} disabled={loading}>
              Limpiar
            </SystemButton>
          </div>
        </section>

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
            {data?.upcomingPayments ? <UpcomingPaymentsTable title="Próximos pagos" rows={data.upcomingPayments} /> : null}
            {data?.overduePayments ? <OverduePaymentsTable rows={data.overduePayments} /> : null}
          </div>
        ) : null}

        {data?.topSuppliers || data?.topItems ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {data?.topSuppliers ? (
              <PurchaseDashboardRankingTable
                title="Top proveedores"
                tableId="purchase-dashboard-top-suppliers"
                headers={["Proveedor", "Compras", "Total"]}
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

const inputClass = "h-10 w-full rounded-md border border-black/10 bg-white px-3 text-sm text-black outline-none focus:border-black/30 focus:ring-2 focus:ring-black/10";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="space-y-1.5">
      <span className="text-xs font-medium text-black/65">{label}</span>
      {children}
    </label>
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
