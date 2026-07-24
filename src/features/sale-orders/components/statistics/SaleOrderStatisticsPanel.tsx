import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
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
import { SystemButton } from "@/shared/components/components/SystemButton";

export type LocationDistributionLevel =
  | "department"
  | "province"
  | "district";

export type LocationDistributionGroup = {
  id: string;
  label: string;
  orders: number;
  total: number;
  deliveryCostSum: number;
  collected: number;
  pending: number;
};

export type LocationDistributionData = {
  groups: LocationDistributionGroup[];
  totals: {
    orders: number;
    total: number;
    deliveryCostSum: number;
    collected: number;
    pending: number;
  };
};

type LocationDistributionProps = {
  data: LocationDistributionData | null;
  loading: boolean;
  error: string | null;
  level: LocationDistributionLevel;
  onGroupClick: (group: LocationDistributionGroup) => void;
  onBack: () => void;
};

type Props = {
  statistics: SaleOrderStatisticsResponse | null;
  loading: boolean;
  error: string | null;
  compact: boolean;
  showTotals?: boolean;
  showCharts?: boolean;
  locationDistribution?: LocationDistributionProps;
};

type BankAccountChartItem = {
  id: string;
  name: string;
  collected: number;
  payments: number;
  percentage: number;
  level: "description" | "account";
  accounts: Array<{
    label: string;
    payments: number;
    collected: number;
  }>;
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
    statistics.byPaymentDescription.length === 0 &&
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
  locationDistribution,
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

  const hasLocationData =
    (locationDistribution?.data?.groups.length ?? 0) > 0;

  if (isEmpty(statistics) && !hasLocationData) {
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
        <div className="grid gap-3 xl:grid-cols-6">
          <ChartCard
            title="Pedidos por tipo"
            compact={compact}
            className="xl:col-span-2"
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
            className="xl:col-span-2"
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
            className="xl:col-span-2"
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
                    innerRadius="40%"
                    outerRadius="100%"
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
              data={statistics.byPaymentDescription}
              height={220}
            />
          </ChartCard>

          {locationDistribution ? (
            <LocationDistributionCard
              distribution={locationDistribution}
              compact={compact}
            />
          ) : null}
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
    <div className="mb-3 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <MetricCard
        label="Total pedidos"
        value={String(statistics.totals.orders)}
        compact={compact}
      />

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
  headerAction,
}: {
  title: ReactNode;
  compact: boolean;
  children: ReactNode;
  className?: string;
  headerAction?: ReactNode;
}) {
  return (
    <article
      className={`min-w-0 rounded-sm border border-zinc-100 bg-white ${
        compact ? "p-2" : "p-3"
      } ${className}`}
    >
      <div className="flex min-w-0 items-center justify-between gap-2">
        <h3 className="min-w-0 truncate text-xs font-semibold text-zinc-800">
          {title}
        </h3>

        {headerAction}
      </div>

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


const LOCATION_LEVEL_LABEL: Record<
  LocationDistributionLevel,
  string
> = {
  department: "departamentos",
  province: "provincias",
  district: "distritos",
};

function LocationDistributionCard({
  distribution,
  compact,
}: {
  distribution: LocationDistributionProps;
  compact: boolean;
}) {
  const {
    data,
    loading,
    error,
    level,
    onGroupClick,
    onBack,
  } = distribution;

  const chartHeight = compact ? 200 : 240;
  const chartWidth = Math.max(
    460,
    (data?.groups.length ?? 0) * 62,
  );

  return (
    <ChartCard
      title={`Distribución por ${LOCATION_LEVEL_LABEL[level]}`}
      compact={compact}
      className="xl:col-span-3"
      headerAction={
        level !== "department" ? (
          <SystemButton
            type="button"
            variant="ghost"
            size="icon"
            onClick={onBack}
            aria-label={
              level === "district"
                ? "Volver a provincias"
                : "Volver a departamentos"
            }
            className="h-7 w-7 shrink-0 rounded-sm text-zinc-600"
          >
            <ArrowLeft className="h-4 w-4" />
          </SystemButton>
        ) : null
      }
    >
      {loading ? (
        <span className="mt-1 block text-[11px] text-zinc-400">
          Actualizando...
        </span>
      ) : null}

      {error ? (
        <div className="mt-2 rounded-sm bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {error}
        </div>
      ) : null}

      {loading && !data ? (
        <div
          style={{ height: chartHeight }}
          className="grid place-items-center text-xs text-zinc-500"
        >
          Cargando métricas...
        </div>
      ) : data && data.groups.length > 0 ? (
        <div className="mt-1 overflow-x-auto overflow-y-hidden scroll-area">
          <div
            style={{
              width: chartWidth,
              height: chartHeight,
            }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.groups}
                margin={{
                  top: 24,
                  right: 8,
                  left: -24,
                  bottom: 54,
                }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#e4e4e7"
                />

                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 9 }}
                  angle={-35}
                  textAnchor="end"
                  interval={0}
                  height={65}
                />

                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 9 }}
                  axisLine={false}
                  tickLine={false}
                />

                <Tooltip
                  content={<LocationChartTooltip />}
                  cursor={{
                    fill: "#f4f4f5",
                    opacity: 0.6,
                  }}
                />

                <Bar
                  dataKey="orders"
                  name="Pedidos"
                  radius={[6, 6, 0, 0]}
                  cursor={
                    level === "district"
                      ? "default"
                      : "pointer"
                  }
                >
                  {data.groups.map((group, index) => (
                    <Cell
                      key={
                        group.id ??
                        `${group.label}-${index}`
                      }
                      fill={
                        CHART_COLORS[
                          index % CHART_COLORS.length
                        ]
                      }
                      onClick={() => {
                        if (
                          level !== "district" &&
                          group.id
                        ) {
                          onGroupClick(group);
                        }
                      }}
                    />
                  ))}

                  <LabelList
                    dataKey="orders"
                    position="top"
                    formatter={(value: unknown) =>
                      String(Number(value) || 0)
                    }
                    style={{
                      fill: "#3f3f46",
                      fontSize: 10,
                      fontWeight: 700,
                    }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : !error ? (
        <div
          style={{ height: chartHeight }}
          className="grid place-items-center text-center text-xs text-zinc-500"
        >
          No hay métricas para los filtros actuales.
        </div>
      ) : null}
    </ChartCard>
  );
}

function LocationChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{
    payload?: LocationDistributionGroup;
  }>;
}) {
  const group = payload?.[0]?.payload;

  if (!active || !group) return null;

  return (
    <div className="min-w-[170px] rounded-sm border border-zinc-200 bg-white p-2.5 shadow-lg">
      <div className="text-xs font-semibold text-zinc-900">
        {group.label}
      </div>

      <div className="mt-2 space-y-1 text-[10px]">
        <div className="flex justify-between gap-4">
          <span className="text-zinc-500">Pedidos</span>
          <span className="font-semibold tabular-nums text-zinc-900">
            {group.orders}
          </span>
        </div>

        <div className="flex justify-between gap-4">
          <span className="text-zinc-500">Total</span>
          <span className="font-semibold tabular-nums text-zinc-900">
            {formatMoney(group.total)}
          </span>
        </div>
      </div>
    </div>
  );
}

function BankAccountBarChart({
  data,
  height,
}: {
  data: SaleOrderStatisticsResponse["byPaymentDescription"];
  height: number;
}) {
  const [selectedDescriptions, setSelectedDescriptions] = useState<string[]>([]);
  const [activeDescriptionId, setActiveDescriptionId] = useState<string | null>(
    null,
  );

  const descriptionOptions = useMemo(() => {
    const seen = new Set<string>();
    const options: Array<{ value: string; label: string }> = [];

    data.forEach((description, index) => {
      const value = getPaymentDescriptionKey(description, index);

      if (seen.has(value)) {
        return;
      }

      seen.add(value);
      options.push({
        value,
        label:
          description.label.trim() ||
          description.description?.trim() ||
          "Sin descripcion",
      });
    });

    return options;
  }, [data]);

  useEffect(() => {
    if (selectedDescriptions.length === 0) {
      return;
    }

    const validValues = new Set(
      descriptionOptions.map((option) => option.value),
    );
    const nextDescriptions = selectedDescriptions.filter((description) =>
      validValues.has(description),
    );

    if (nextDescriptions.length !== selectedDescriptions.length) {
      setSelectedDescriptions(nextDescriptions);
    }
  }, [descriptionOptions, selectedDescriptions]);

  const selectedSet = new Set(selectedDescriptions);
  const descriptionData: BankAccountChartItem[] = data
    .map((item, index): BankAccountChartItem | null => {
      const value = getPaymentDescriptionKey(item, index);

      if (selectedSet.size > 0 && !selectedSet.has(value)) {
        return null;
      }

      const collected = Number(item.collected) || 0;
      const payments = Number(item.payments) || 0;

      return {
        id: value,
        name:
          item.label.trim() ||
          item.description?.trim() ||
          "Sin descripcion",
        collected,
        payments,
        percentage: 0,
        level: "description",
        accounts: item.byBankAccount.map((account) => ({
          label: account.label,
          payments: Number(account.payments) || 0,
          collected: Number(account.collected) || 0,
        })),
      };
    })
    .filter(
      (item): item is BankAccountChartItem =>
        item !== null,
    );

  useEffect(() => {
    if (!activeDescriptionId) {
      return;
    }

    const validDescription = data.some(
      (item, index) =>
        getPaymentDescriptionKey(item, index) === activeDescriptionId &&
        (selectedDescriptions.length === 0 ||
          selectedDescriptions.includes(activeDescriptionId)),
    );

    if (!validDescription) {
      setActiveDescriptionId(null);
    }
  }, [activeDescriptionId, data, selectedDescriptions]);

  const activeDescription =
    descriptionData.find((item) => item.id === activeDescriptionId) ?? null;

  const rawChartData: BankAccountChartItem[] = activeDescription
    ? activeDescription.accounts.map((account, index) => ({
        id: `${activeDescription.id}-account-${index}`,
        name: account.label,
        collected: account.collected,
        payments: account.payments,
        percentage: 0,
        level: "account",
        accounts: [],
      }))
    : descriptionData;

  const valueKey = "collected";
  const totalValue = rawChartData.reduce(
    (total, item) => total + Number(item[valueKey]),
    0,
  );

  const totalCollected = rawChartData.reduce(
    (total, item) => total + item.collected,
    0,
  );

  const chartDataWithPercentages: BankAccountChartItem[] = rawChartData
    .map((item) => ({
      ...item,
      percentage:
        totalValue > 0
          ? (Number(item[valueKey]) / totalValue) * 100
          : 0,
    }))
    .sort((a, b) => Number(b[valueKey]) - Number(a[valueKey]));

  const chartContentHeight = Math.max(
    110,
    chartDataWithPercentages.length * 36,
  );

  const visibleHeight = Math.min(
    Math.min(height, 180),
    chartContentHeight,
  );

  return (
    <div className="mt-2 min-w-0 space-y-2">
      {/* {descriptionOptions.length > 1 ? (
        <FloatingMultiSelect
          label="Descripciones de pago"
          name="bank-account-chart-description"
          value={selectedDescriptions}
          options={descriptionOptions}
          onChange={setSelectedDescriptions}
          searchable
          searchPlaceholder="Buscar descripcion..."
          containerClassName="w-full sm:w-64"
        />
      ) : null} */}

      {activeDescription ? (
        <div className="flex min-w-0 items-center justify-between gap-2">
          <SystemButton
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setActiveDescriptionId(null)}
            className="h-7 shrink-0 rounded-sm px-2 text-[11px] text-zinc-600"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Descripciones
          </SystemButton>

          <span className="min-w-0 truncate text-[11px] font-medium text-zinc-500">
            {activeDescription.name} | {activeDescription.payments} pagos |{" "}
            {formatMoney(totalCollected)}
          </span>
        </div>
      ) : null}

      {chartDataWithPercentages.length === 0 ? (
        <div className="grid min-h-[100px] place-items-center text-xs text-zinc-400">
          No existen cobros registrados en cuentas bancarias.
        </div>
      ) : (
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
                data={chartDataWithPercentages}
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
                      data={chartDataWithPercentages}
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
                  dataKey={valueKey}
                  name="Cobrado"
                  fill="url(#bank-account-gradient)"
                  radius={[0, 5, 5, 0]}
                  maxBarSize={20}
                  cursor={activeDescription ? "default" : "pointer"}
                >
                  {chartDataWithPercentages.map((item) => (
                    <Cell
                      key={item.id}
                      cursor={
                        activeDescription
                          ? "default"
                          : "pointer"
                      }
                      aria-label={`Ver cuentas de ${item.name}`}
                      onClick={() => {
                        if (!activeDescription) {
                          setActiveDescriptionId(item.id);
                        }
                      }}
                    />
                  ))}

                  <LabelList
                    dataKey={valueKey}
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
      )}
    </div>
  );
}

function getPaymentDescriptionKey(
  item: SaleOrderStatisticsResponse["byPaymentDescription"][number],
  index: number,
) {
  return (
    item.description?.trim() ||
    item.label.trim() ||
    `description-${index}`
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
