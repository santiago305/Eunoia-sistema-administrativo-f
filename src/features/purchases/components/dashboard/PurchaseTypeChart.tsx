import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { PurchaseDashboardSeriesPoint } from "@/features/purchases/types/purchase-dashboard.types";
import { money } from "@/shared/utils/functionPurchases";

const COLORS = ["#2563eb", "#16a34a", "#f59e0b", "#dc2626", "#7c3aed", "#0891b2", "#52525b"];

type Props = {
  title: string;
  description: string;
  data: PurchaseDashboardSeriesPoint[];
  valueMode?: "money" | "count";
};

export function PurchaseTypeChart({ title, description, data, valueMode = "money" }: Props) {
  const format = (value: number) => (valueMode === "money" ? money(value, "PEN") : String(value));

  return (
    <section className="rounded-md border border-black/10 bg-white p-4" aria-label={title}>
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-black">{title}</h2>
        <p className="text-xs text-black/55">{description}</p>
      </div>
      <div className="grid gap-3 md:grid-cols-[minmax(180px,220px)_1fr]">
        <div className="h-56 min-h-56">
          {data.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} dataKey="value" nameKey="label" innerRadius={52} outerRadius={82} paddingAngle={2}>
                  {data.map((entry, index) => (
                    <Cell key={entry.label} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => format(Number(value))} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center rounded-md border border-dashed border-black/10 text-sm text-black/45">Sin datos</div>
          )}
        </div>
        <div className="space-y-2">
          {data.slice(0, 7).map((item, index) => (
            <div key={item.label} className="flex items-center justify-between gap-3 text-xs">
              <span className="flex min-w-0 items-center gap-2 text-black/70">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} aria-hidden="true" />
                <span className="truncate">{item.label}</span>
              </span>
              <span className="shrink-0 font-medium tabular-nums text-black">{format(item.value)}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

