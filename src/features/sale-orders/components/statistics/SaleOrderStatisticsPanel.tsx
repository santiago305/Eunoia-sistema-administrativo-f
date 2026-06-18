import type { ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
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

type BankAccountChartItem = {
  id: string | number | null;
  name: string;
  collected: number;
  payments: number;
  percentage: number;
};

const CHART_COLORS = [
  "#2563eb",
  "#0ea5e9",
  "#14b8a6",
  "#8b5cf6",
  "#f59e0b",
];

const BANK_ACCOUNT_COLLECTED_COLOR = "#2563eb";

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
    statistics.byBankAccount.length === 0 &&
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
      <div className="rounded-sm bg-rose-50 p-3 text-sm text-rose-700">
        {error}
      </div>
    ) : null;
  }

  if (isEmpty(statistics)) {
    return (
      <div className="grid min-h-[240px] place-items-center rounded-sm border border-zinc-100 text-sm text-zinc-500">
        No hay estadísticas para los filtros actuales.
      </div>
    );
  }

  const chartHeight = compact ? 110 : 130;

  return (
    <section
      data-testid="sale-order-statistics"
      data-compact={compact}
      className={`overflow-hidden transition-all duration-500 ease-out ${
        compact ? "space-y-2 py-2" : "space-y-4 py-4"
      }`}
    >
      {loading ? (
        <span className="text-[11px] text-zinc-400">
          Actualizando...
        </span>
      ) : null}

      {error ? (
        <div className="rounded-sm bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {error}
        </div>
      ) : null}

      {showTotals ? (
        <SaleOrderStatisticsTotals
          statistics={statistics}
          compact={compact}
        />
      ) : null}

      {showCharts ? (
        <div className="grid gap-3 xl:grid-cols-3">
          <ChartCard
            title="Pedidos por flujo"
            compact={compact}
          >
            <BarDistribution
              data={statistics.byWorkflow}
              height={chartHeight}
              colors={CHART_COLORS}
            />

            <ChartLegend
              items={statistics.byWorkflow}
              colors={CHART_COLORS}
            />
          </ChartCard>

          <ChartCard
            title="Pedidos por estado"
            compact={compact}
          >
            <BarDistribution
              data={statistics.byState}
              height={chartHeight}
              colors={statistics.byState.map(
                (item) => item.color || "#94a3b8",
              )}
            />

            <ChartLegend
              items={statistics.byState}
              colors={statistics.byState.map(
                (item) => item.color || "#94a3b8",
              )}
            />
          </ChartCard>

          <ChartCard
            title="Pedidos por tipo de cliente"
            compact={compact}
          >
            <div
              style={{ height: chartHeight }}
              className="w-full overflow-hidden"
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip />

                  <Pie
                    data={statistics.byClientType}
                    dataKey="count"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    innerRadius="50%"
                    outerRadius="90%"
                    paddingAngle={2}
                  >
                    {statistics.byClientType.map((item) => (
                      <Cell
                        key={item.type}
                        fill={
                          CLIENT_TYPE_COLORS[item.type] ??
                          "#94a3b8"
                        }
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>

            <ChartLegend
              items={statistics.byClientType}
              colors={statistics.byClientType.map(
                (item) =>
                  CLIENT_TYPE_COLORS[item.type] ??
                  "#94a3b8",
              )}
            />
          </ChartCard>

          <ChartCard
            title="Cuentas bancarias"
            compact={compact}
            className="xl:col-span-3"
          >
            <BankAccountBarChart
              data={statistics.byBankAccount}
              height={150}
            />
          </ChartCard>
        </div>
      ) : null}
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
    <div className="mb-3 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard
        label="Total"
        value={formatMoney(statistics.totals.total)}
        compact={compact}
      />

      <MetricCard
        label="Total Tarifa"
        value={formatMoney(
          statistics.totals.deliveryCostSum,
        )}
        compact={compact}
      />

      <MetricCard
        label="Total cobrado"
        value={formatMoney(statistics.totals.collected)}
        compact={compact}
      />

      <MetricCard
        label="Total pendiente"
        value={formatMoney(statistics.totals.pending)}
        compact={compact}
      />
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
    <div
      className={`rounded-sm bg-zinc-50 shadow-inner ${
        compact ? "p-2" : "p-3"
      }`}
    >
      <div className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">
        {label}
      </div>

      <div
        className={`font-semibold tabular-nums text-zinc-950 ${
          compact ? "mt-0.5 text-sm" : "mt-1 text-base"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function ChartCard({
  title,
  compact,
  children,
  className = "",
}: {
  title: string;
  compact: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <article
      className={`min-w-0 rounded-sm border border-zinc-100 bg-white ${
        compact ? "p-2" : "p-3"
      } ${className}`}
    >
      <h3 className="text-xs font-semibold text-zinc-800">
        {title}
      </h3>

      {children}
    </article>
  );
}

function BarDistribution({
  data,
  height,
  colors,
}: {
  data: Array<{
    label: string;
    count: number;
  }>;
  height: number;
  colors: string[];
}) {
  return (
    <div
      style={{ height }}
      className="w-full"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{
            top: 12,
            right: 8,
            left: -24,
            bottom: 0,
          }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#e4e4e7"
          />

          <XAxis
            dataKey="label"
            hide
          />

          <YAxis
            allowDecimals={false}
            tick={{
              fill: "#71717a",
              fontSize: 10,
            }}
            axisLine={false}
            tickLine={false}
          />

          <Tooltip />

          <Bar
            dataKey="count"
            name="Pedidos"
            radius={[6, 6, 0, 0]}
          >
            {data.map((item, index) => (
              <Cell
                key={`${item.label}-${index}`}
                fill={colors[index % colors.length]}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function BankAccountBarChart({
  data,
  height,
}: {
  data: SaleOrderStatisticsResponse["byBankAccount"];
  height: number;
}) {
  const totalCollected = data.reduce(
    (total, item) =>
      total + (Number(item.collected) || 0),
    0,
  );

  const chartData: BankAccountChartItem[] = data
    .map((item) => {
      const collected = Number(item.collected) || 0;
      const payments = Number(item.payments) || 0;

      return {
        id: item.id ?? null,
        name: item.label,
        collected,
        payments,
        percentage:
          totalCollected > 0
            ? (collected / totalCollected) * 100
            : 0,
      };
    })
    .sort((a, b) => b.collected - a.collected);

  if (chartData.length === 0) {
    return (
      <div className="grid min-h-[100px] place-items-center text-xs text-zinc-400">
        No existen cobros registrados en cuentas bancarias.
      </div>
    );
  }

  const chartContentHeight = Math.max(
    110,
    chartData.length * 36,
  );

  const visibleHeight = Math.min(
    Math.min(height, 180),
    chartContentHeight,
  );

  return (
    <div className="mt-0 min-w-0">
      <div
        style={{ height: visibleHeight }}
        className="overflow-y-auto overflow-x-hidden scroll-area"
      >
        <div
          style={{ height: chartContentHeight }}
          className="w-full min-w-0"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{
                top: 4,
                right: 88,
                left: 0,
                bottom: 20,
              }}
              barCategoryGap="18%"
            >
              <defs>
                <linearGradient
                  id="bank-account-gradient"
                  x1="0"
                  y1="0"
                  x2="1"
                  y2="0"
                >
                  <stop
                    offset="0%"
                    stopColor={
                      BANK_ACCOUNT_COLLECTED_COLOR
                    }
                  />

                  <stop
                    offset="100%"
                    stopColor="#60a5fa"
                  />
                </linearGradient>
              </defs>

              <CartesianGrid
                horizontal={false}
                strokeDasharray="3 3"
                stroke="#f4f4f5"
              />

              <XAxis
                type="number"
                hide
                domain={[0, "dataMax"]}
              />

              <YAxis
                type="category"
                dataKey="name"
                width={100}
                axisLine={false}
                tickLine={false}
                interval={0}
                tick={(props) => (
                  <BankAccountAxisTick
                    {...props}
                    data={chartData}
                  />
                )}
              />

              <Tooltip
                cursor={{
                  fill: "#f4f4f5",
                }}
                content={<BankAccountTooltip />}
              />

              <Bar
                dataKey="collected"
                name="Cobrado"
                fill="url(#bank-account-gradient)"
                radius={[0, 5, 5, 0]}
                maxBarSize={20}
              >
                <LabelList
                  dataKey="collected"
                  position="right"
                  formatter={(value: unknown) =>
                    formatMoney(Number(value))
                  }
                  style={{
                    fill: "#52525b",
                    fontSize: 9,
                    fontWeight: 600,
                  }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function BankAccountAxisTick({
  x = 0,
  y = 0,
  payload,
  data,
}: {
  x?: number;
  y?: number;
  payload?: {
    value?: string;
  };
  data: BankAccountChartItem[];
}) {
  const item = data.find(
    (account) => account.name === payload?.value,
  );

  if (!item) return null;

  const displayName =
    item.name.length > 17
      ? `${item.name.slice(0, 17)}...`
      : item.name;

  return (
    <g transform={`translate(${x}, ${y})`}>
      <text
        x={-6}
        y={-2}
        textAnchor="end"
        fill="#3f3f46"
        fontSize={9}
        fontWeight={600}
      >
        {displayName}
      </text>

      <text
        x={-6}
        y={9}
        textAnchor="end"
        fill="#a1a1aa"
        fontSize={8}
      >
        {item.payments}{" "}
        {item.payments === 1 ? "pago" : "pagos"}
      </text>
    </g>
  );
}

function BankAccountTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{
    payload?: BankAccountChartItem;
  }>;
}) {
  const item = payload?.[0]?.payload;

  if (!active || !item) return null;

  return (
    <div className="min-w-[180px] rounded-sm border border-zinc-200 bg-white p-2.5 shadow-lg">
      <div className="text-xs font-semibold text-zinc-900">
        {item.name}
      </div>

      <div className="mt-2 space-y-1 text-[10px]">
        <div className="flex justify-between gap-4">
          <span className="text-zinc-500">
            Total cobrado
          </span>

          <span className="font-semibold tabular-nums text-zinc-900">
            {formatMoney(item.collected)}
          </span>
        </div>

        <div className="flex justify-between gap-4">
          <span className="text-zinc-500">
            Pagos
          </span>

          <span className="font-medium tabular-nums text-zinc-700">
            {item.payments}
          </span>
        </div>
      </div>
    </div>
  );
}

function ChartLegend({
  items,
  colors,
}: {
  items: Array<{
    label: string;
    count: number;
  }>;
  colors: string[];
}) {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1">
      {items.map((item, index) => (
        <div
          key={`${item.label}-${index}`}
          className="flex items-center gap-1 text-[10px] text-zinc-500"
        >
          <span
            className="h-2 w-2 rounded-full"
            style={{
              backgroundColor:
                colors[index % colors.length],
            }}
          />

          <span>{item.label}</span>

          <span className="font-semibold text-zinc-700">
            {item.count}
          </span>
        </div>
      ))}
    </div>
  );
}
