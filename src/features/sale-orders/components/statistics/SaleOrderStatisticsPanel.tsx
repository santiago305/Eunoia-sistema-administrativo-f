import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { SaleOrderStatisticsResponse } from "../../types/saleOrder";

type Props = {
  statistics: SaleOrderStatisticsResponse | null;
  loading: boolean;
  error: string | null;
  compact: boolean;
  showTotals?: boolean;
  showCharts?: boolean;
};

const CHART_COLORS = ["#2563eb", "#0ea5e9", "#14b8a6", "#8b5cf6", "#f59e0b"];
 export const CLIENT_TYPE_COLORS: Record<string, string> = {
  NEW: "#0ea5e9",
  LAGGING: "#f59e0b",
  REPURCHASE: "#10b981",
  UNDEFINED: "#94a3b8",
};

function formatMoney(value: number) {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
  }).format(Number(value) || 0);
}

function isEmpty(statistics: SaleOrderStatisticsResponse) {
  return (
    statistics.byWorkflow.length === 0 &&
    statistics.byState.length === 0 &&
    statistics.byClientType.length === 0 &&
    statistics.totals.orders === 0 &&
    statistics.totals.total === 0 &&
    statistics.totals.collected === 0 &&
    statistics.totals.pending === 0
  );
}

export function SaleOrderStatisticsPanel({
  statistics,
  loading,
  error,
  compact,
  showTotals = true,
  showCharts = true,
}: Props) {
  if (loading && !statistics) {
    return (
      <div className="grid min-h-[240px] place-items-center text-sm text-zinc-500">
        Cargando estadísticas...
      </div>
    );
  }

  if (!statistics) {
    return error ? (
      <div className="rounded-sm bg-rose-50 p-3 text-sm text-rose-700">{error}</div>
    ) : null;
  }

  if (isEmpty(statistics)) {
    return (
      <div className="grid min-h-[240px] place-items-center rounded-sm border border-zinc-100 text-sm text-zinc-500">
        No hay estadísticas para los filtros actuales.
      </div>
    );
  }

  const chartHeight = compact ? 130 : 220;

  return (
    <section
      data-testid="sale-order-statistics"
      data-compact={compact}
      className={`overflow-hidden transition-all duration-500 ease-out ${
        compact ? "space-y-2 py-2" : "space-y-4 py-4"
      }`}
    >
    
      {loading ? <span className="text-[11px] text-zinc-400">Actualizando...</span> : null}

      {error ? (
        <div className="rounded-sm bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</div>
      ) : null}

      {showTotals ? (
        <SaleOrderStatisticsTotals statistics={statistics} compact={compact} />
      ) : null}

      {showCharts ? <div className="grid gap-3 xl:grid-cols-3">
        <ChartCard title="Pedidos por flujo" compact={compact}>
          <BarDistribution
            data={statistics.byWorkflow}
            height={chartHeight}
            colors={CHART_COLORS}
          />
          <ChartLegend items={statistics.byWorkflow} colors={CHART_COLORS} />
        </ChartCard>

        <ChartCard title="Pedidos por estado" compact={compact}>
          <BarDistribution
            data={statistics.byState}
            height={chartHeight}
            colors={statistics.byState.map((item) => item.color || "#94a3b8")}
          />
          <ChartLegend
            items={statistics.byState}
            colors={statistics.byState.map((item) => item.color || "#94a3b8")}
          />
        </ChartCard>

        <ChartCard title="Pedidos por tipo de cliente" compact={compact}>
          <div style={{ height: chartHeight }} className="w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip />
                <Pie
                  data={statistics.byClientType}
                  dataKey="count"
                  nameKey="label"
                  innerRadius={compact ? 28 : 48}
                  outerRadius={compact ? 48 : 78}
                  paddingAngle={2}
                >
                  {statistics.byClientType.map((item) => (
                    <Cell
                      key={item.type}
                      fill={CLIENT_TYPE_COLORS[item.type] ?? "#94a3b8"}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ChartLegend
            items={statistics.byClientType}
            colors={statistics.byClientType.map(
              (item) => CLIENT_TYPE_COLORS[item.type] ?? "#94a3b8",
            )}
          />
        </ChartCard>
      </div> : null}
    </section>
  );
}

export function SaleOrderStatisticsTotals({
  statistics,
  compact = true,
}: {
  statistics: SaleOrderStatisticsResponse | null;
  compact?: boolean;
}) {
  if (!statistics) return null;

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-4 mb-3">
      <MetricCard label="Total" value={formatMoney(statistics.totals.total)} compact={compact} />
      <MetricCard label="Total Tarifa" value={formatMoney(statistics.totals.deliveryCostSum)} compact={compact} />
      <MetricCard label="Total cobrado" value={formatMoney(statistics.totals.collected)} compact={compact} />
      <MetricCard label="Total pendiente" value={formatMoney(statistics.totals.pending)} compact={compact} />
    </div>
  );
}

function MetricCard({
  label,
  value,
  compact,
}: {
  label: string;
  value: string;
  compact: boolean;
}) {
  return (
    <div className={`rounded-sm bg-zinc-50 shadow-inner ${compact ? "p-2" : "p-3"}`}>
      <div className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">{label}</div>
      <div className={`font-semibold tabular-nums text-zinc-950 ${compact ? "mt-0.5 text-sm" : "mt-1 text-base"}`}>
        {value}
      </div>
      
    </div>
  );
}

function ChartCard({
  title,
  compact,
  children,
}: {
  title: string;
  compact: boolean;
  children: React.ReactNode;
}) {
  return (
    <article className={`rounded-sm border border-zinc-100 bg-white ${compact ? "p-2" : "p-3"}`}>
      <h3 className="text-xs font-semibold text-zinc-800">{title}</h3>
      {children}
    </article>
  );
}

function BarDistribution({
  data,
  height,
  colors,
}: {
  data: Array<{ label: string; count: number }>;
  height: number;
  colors: string[];
}) {
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 12, right: 8, left: -24, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
          <XAxis dataKey="label" hide />
          <YAxis allowDecimals={false} tick={{ fill: "#71717a", fontSize: 10 }} axisLine={false} tickLine={false} />
          <Tooltip />
          <Bar dataKey="count" name="Pedidos" radius={[6, 6, 0, 0]}>
            {data.map((item, index) => (
              <Cell key={`${item.label}-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function ChartLegend({
  items,
  colors,
}: {
  items: Array<{ label: string; count: number }>;
  colors: string[];
}) {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1">
      {items.map((item, index) => (
        <div key={`${item.label}-${index}`} className="flex items-center gap-1 text-[10px] text-zinc-500">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: colors[index % colors.length] }} />
          <span>{item.label}</span>
          <span className="font-semibold text-zinc-700">{item.count}</span>
        </div>
      ))}
    </div>
  );
}
