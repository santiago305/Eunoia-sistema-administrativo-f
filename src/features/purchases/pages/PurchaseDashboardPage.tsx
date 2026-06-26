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
import type { PurchaseDashboardFilters } from "@/features/purchases/types/purchase-dashboard.types";

const purchaseTypeOptions = [
  ["", "Todos los tipos"],
  ["INVENTORY", "Inventario"],
  ["RAW_MATERIAL", "Materia prima"],
  ["INTERNAL_MATERIAL", "Material interno"],
  ["FIXED_ASSET", "Activo fijo"],
  ["SERVICE", "Servicio"],
  ["SUBSCRIPTION", "Suscripcion"],
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
            <Field label="Almacen">
              <input value={draftFilters.warehouseId ?? ""} onChange={(event) => updateDraft("warehouseId", event.target.value)} className={inputClass} placeholder="UUID almacen" />
            </Field>
            <Field label="Metodo de pago">
              <input value={draftFilters.paymentMethodId ?? ""} onChange={(event) => updateDraft("paymentMethodId", event.target.value)} className={inputClass} placeholder="UUID metodo" />
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
        {loading ? <div className="rounded-md border border-black/10 bg-white px-4 py-6 text-sm text-black/55">Cargando metricas...</div> : null}

        <PurchaseKpiGrid summary={data?.summary ?? emptySummary} />

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)]">
          <PurchaseSpendingChart data={data?.monthlySpending ?? []} />
          <PurchaseTypeChart title="Compras por tipo" description="Distribucion por monto comprado." data={data?.byType ?? []} />
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          <PurchasePaymentStatusChart title="Estado financiero" data={data?.byStatus ?? []} />
          <PurchaseTypeChart title="Uso de metodos" description="Solo pagos aprobados." data={data?.paymentMethodUsage ?? []} />
          <PurchaseTypeChart title="Inventario vs interno" description="Clasificacion operativa por reglas de recepcion." data={data?.internalVsInventory ?? []} />
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <UpcomingPaymentsTable title="Proximos pagos" rows={data?.upcomingPayments ?? []} />
          <OverduePaymentsTable rows={data?.overduePayments ?? []} />
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <RankingTable
            title="Top proveedores"
            headers={["Proveedor", "Compras", "Total"]}
            rows={(data?.topSuppliers ?? []).map((item) => [item.supplierName, String(item.count), formatMoney(item.total)])}
          />
          <RankingTable
            title="Top items"
            headers={["Item", "Tipo", "Total"]}
            rows={(data?.topItems ?? []).map((item) => [item.label, item.itemType, formatMoney(item.total)])}
          />
        </div>
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

function RankingTable({ title, headers, rows }: { title: string; headers: string[]; rows: string[][] }) {
  return (
    <section className="rounded-md border border-black/10 bg-white p-4">
      <h2 className="text-sm font-semibold text-black">{title}</h2>
      <div className="mt-3 overflow-x-auto">
        <table className="min-w-full text-left text-xs">
          <thead className="border-b border-black/10 text-black/55">
            <tr>{headers.map((header) => <th key={header} className="py-2 pr-3 font-medium last:text-right">{header}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {rows.map((row, index) => (
              <tr key={`${row[0]}-${index}`}>
                {row.map((cell, cellIndex) => (
                  <td key={`${cell}-${cellIndex}`} className="py-2 pr-3 text-black/75 last:text-right last:font-medium last:text-black">{cell}</td>
                ))}
              </tr>
            ))}
            {!rows.length ? (
              <tr>
                <td colSpan={headers.length} className="py-6 text-center text-black/45">Sin datos para mostrar.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(value);
}
