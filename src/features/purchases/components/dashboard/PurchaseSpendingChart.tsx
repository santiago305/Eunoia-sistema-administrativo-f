import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { PurchaseDashboardMonthlyPoint } from "@/features/purchases/types/purchase-dashboard.types";
import { money } from "@/shared/utils/functionPurchases";

type Props = {
  data: PurchaseDashboardMonthlyPoint[];
};

export function PurchaseSpendingChart({ data }: Props) {
  return (
    <section className="rounded-md border border-black/10 bg-white p-4" aria-label="Gasto mensual de compras y pagos">
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-black">Gasto mensual</h2>
        <p className="text-xs text-black/55">Comprado contra pagado aprobado.</p>
      </div>
      <div className="h-72 min-h-72">
        {data.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} width={72} tickFormatter={(value) => money(Number(value), "PEN")} />
              <Tooltip formatter={(value) => money(Number(value), "PEN")} />
              <Area type="monotone" dataKey="purchased" name="Comprado" stroke="#2563eb" fill="#bfdbfe" strokeWidth={2} />
              <Area type="monotone" dataKey="paid" name="Pagado" stroke="#059669" fill="#bbf7d0" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChart />
        )}
      </div>
    </section>
  );
}

function EmptyChart() {
  return <div className="flex h-full items-center justify-center rounded-md border border-dashed border-black/10 text-sm text-black/45">Sin datos para el rango seleccionado.</div>;
}

