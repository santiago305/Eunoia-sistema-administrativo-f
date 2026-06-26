import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { PurchaseDashboardSeriesPoint } from "@/features/purchases/types/purchase-dashboard.types";
import { money } from "@/shared/utils/functionPurchases";

type Props = {
  title: string;
  data: PurchaseDashboardSeriesPoint[];
};

export function PurchasePaymentStatusChart({ title, data }: Props) {
  return (
    <section className="rounded-md border border-black/10 bg-white p-4" aria-label={title}>
      <h2 className="text-sm font-semibold text-black">{title}</h2>
      <div className="mt-3 h-64 min-h-64">
        {data.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} width={72} tickFormatter={(value) => money(Number(value), "PEN")} />
              <Tooltip formatter={(value) => money(Number(value), "PEN")} />
              <Bar dataKey="value" name="Monto" fill="#0f766e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center rounded-md border border-dashed border-black/10 text-sm text-black/45">Sin datos</div>
        )}
      </div>
    </section>
  );
}

