import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Info,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Modal } from "@/shared/components/modales/Modal";
import { SystemButton } from "@/shared/components/components/SystemButton";
import {
  getAdviserAnalytics,
  type AdviserAnalyticsMonths,
  type AdviserAnalyticsResponse,
  type AdviserMonthlyAnalytics,
  type AdviserOption,
} from "@/shared/services/adviserService";

type Props = {
  open: boolean;
  adviser: AdviserOption | null;
  onClose: () => void;
};

type ChartPoint = AdviserMonthlyAnalytics & { monthLabel: string };

const PERIODS: Array<{ value: AdviserAnalyticsMonths; label: string }> = [
  { value: 3, label: "3 meses" },
  { value: 6, label: "6 meses" },
  { value: 12, label: "12 meses" },
];

const money = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});
const compactMoney = new Intl.NumberFormat("es-CO", {
  notation: "compact",
  maximumFractionDigits: 1,
});
const monthFormatter = new Intl.DateTimeFormat("es-CO", {
  month: "short",
  year: "2-digit",
  timeZone: "UTC",
});

const monthLabel = (monthKey: string) => {
  const label = monthFormatter.format(new Date(`${monthKey}-01T00:00:00Z`));
  return label.charAt(0).toUpperCase() + label.slice(1).replace(" de ", " ");
};

const trendContent = {
  improved: {
    label: "Mejoró",
    Icon: ArrowUpRight,
    className: "border-success/25 bg-success/10 text-emerald-700",
  },
  worsened: {
    label: "Disminuyó",
    Icon: ArrowDownRight,
    className: "border-destructive/25 bg-destructive/10 text-destructive",
  },
  stable: {
    label: "Se mantuvo",
    Icon: ArrowRight,
    className: "border-border bg-muted text-muted-foreground",
  },
} as const;

export function AdviserPerformanceModal({ open, adviser, onClose }: Props) {
  const [months, setMonths] = useState<AdviserAnalyticsMonths>(6);
  const [analytics, setAnalytics] = useState<AdviserAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    if (open) setMonths(6);
  }, [adviser?.id, open]);

  useEffect(() => {
    if (!open || !adviser) return;
    let active = true;
    setLoading(true);
    setAnalytics(null);
    setError(null);

    void getAdviserAnalytics(adviser.id, months)
      .then((response) => {
        if (active) setAnalytics(response);
      })
      .catch(() => {
        if (active) {
          setAnalytics(null);
          setError("No fue posible cargar el rendimiento del asesor.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [adviser, months, open, retryToken]);

  const data = useMemo<ChartPoint[]>(
    () =>
      (analytics?.items ?? []).map((item) => ({
        ...item,
        monthLabel: monthLabel(item.monthKey),
      })),
    [analytics],
  );
  const hasActivity = data.some(
    (item) => item.orders > 0 || item.soldTotal > 0 || item.collectedTotal > 0,
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={adviser ? `Rendimiento · ${adviser.name}` : "Rendimiento del asesor"}
      description={adviser?.email}
      className="w-[min(1080px,calc(100vw-1rem))] sm:max-h-[calc(100vh-3rem)]"
      headerClassName="px-5 py-4 sm:px-6"
      bodyClassName="p-4 sm:p-6"
      closeButtonClassName="h-10 w-10"
    >
      <div className="space-y-5" aria-busy={loading}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-semibold text-foreground">Análisis mensual</h3>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Todos los gráficos usan el mismo periodo e incluyen el mes actual.
            </p>
          </div>
          <div
            role="group"
            aria-label="Periodo del análisis"
            className="grid grid-cols-3 rounded-xl border border-border bg-muted/40 p-1"
          >
            {PERIODS.map((period) => (
              <SystemButton
                key={period.value}
                variant="ghost"
                size="custom"
                aria-pressed={months === period.value}
                onClick={() => setMonths(period.value)}
                className={`h-11 rounded-lg px-3 text-sm ${
                  months === period.value
                    ? "bg-background text-primary shadow-sm hover:bg-background"
                    : "text-muted-foreground"
                }`}
              >
                {period.label}
              </SystemButton>
            ))}
          </div>
        </div>

        {error ? (
          <div role="alert" className="flex flex-col gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive sm:flex-row sm:items-center sm:justify-between">
            <span>{error}</span>
            <SystemButton variant="outline" size="sm" onClick={() => setRetryToken((value) => value + 1)} className="shrink-0 self-start sm:self-auto">
              Reintentar
            </SystemButton>
          </div>
        ) : null}

        {loading && !analytics ? <AnalyticsSkeleton /> : null}

        {analytics ? (
          <>
            <PerformanceChart data={data} analytics={analytics} loading={loading} />

            {!hasActivity ? (
              <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-8 text-center">
                <BarChart3 className="mx-auto h-7 w-7 text-muted-foreground" aria-hidden="true" />
                <p className="mt-2 text-sm font-medium text-foreground">Sin actividad en este periodo</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  No hay pedidos, ventas o recaudos para representar.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                <OrdersChart data={data} />
                <FinancialChart data={data} />
              </div>
            )}

            <MonthlyTable data={data} />
          </>
        ) : null}
      </div>
    </Modal>
  );
}

function PerformanceChart({
  data,
  analytics,
  loading,
}: {
  data: ChartPoint[];
  analytics: AdviserAnalyticsResponse;
  loading: boolean;
}) {
  const trend = trendContent[analytics.trend.direction];
  const TrendIcon = trend.Icon;

  return (
    <section className="rounded-2xl border border-border bg-background p-4 shadow-sm sm:p-5" aria-labelledby="performance-chart-title">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 id="performance-chart-title" className="font-semibold text-foreground">
            Evolución del rendimiento
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Puntaje mensual de 0 a 100 según ventas, recaudo y pedidos.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {loading ? <span className="text-xs text-muted-foreground">Actualizando…</span> : null}
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${trend.className}`}>
            <TrendIcon className="h-4 w-4" aria-hidden="true" />
            {trend.label} {Math.abs(analytics.trend.delta)} puntos
          </span>
          <span className="rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
            Actual: {analytics.trend.current}/100
          </span>
        </div>
      </div>

      <div className="mt-4 h-64 min-h-64 w-full" aria-label="Gráfico lineal del puntaje de rendimiento mensual">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 12, right: 12, left: -18, bottom: 0 }}>
            <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
            <XAxis dataKey="monthLabel" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
            <Tooltip content={<PerformanceTooltip />} />
            <Line type="monotone" dataKey="performanceScore" name="Rendimiento" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 4, fill: "hsl(var(--background))", strokeWidth: 3 }} activeDot={{ r: 6 }} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <details className="mt-3 rounded-xl bg-muted/45 px-3 py-2.5 text-sm text-muted-foreground">
        <summary className="flex cursor-pointer list-none items-center gap-2 font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
          <Info className="h-4 w-4 text-primary" aria-hidden="true" />
          ¿Cómo se calcula el rendimiento?
        </summary>
        <p className="mt-2 leading-6">
          Ventas aportan 40%, eficiencia de recaudo 35% y cantidad de pedidos 25%. Ventas y pedidos se comparan con el promedio del asesor dentro del periodo seleccionado.
        </p>
      </details>
    </section>
  );
}

function OrdersChart({ data }: { data: ChartPoint[] }) {
  return (
    <ChartCard title="Pedidos por mes" description="Volumen de pedidos asignados al asesor.">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 12, right: 8, left: -24, bottom: 0 }}>
          <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="monthLabel" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
          <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
          <Tooltip content={<OrdersTooltip />} />
          <Bar dataKey="orders" name="Pedidos" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} maxBarSize={42} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

function FinancialChart({ data }: { data: ChartPoint[] }) {
  return (
    <ChartCard title="Vendido frente a recaudado" description="Evolución mensual de los importes del asesor.">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
          <XAxis dataKey="monthLabel" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
          <YAxis width={54} tickFormatter={(value) => compactMoney.format(Number(value))} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
          <Tooltip content={<FinancialTooltip />} />
          <Line type="monotone" dataKey="soldTotal" name="Vendido" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 3 }} isAnimationActive={false} />
          <Line type="monotone" dataKey="collectedTotal" name="Recaudado" stroke="hsl(var(--success))" strokeWidth={2.5} strokeDasharray="6 4" dot={{ r: 3 }} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
      <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-5 bg-primary" />Vendido</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-5 border-t-2 border-dashed border-success" />Recaudado</span>
      </div>
    </ChartCard>
  );
}

function ChartCard({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section className="min-w-0 rounded-2xl border border-border bg-background p-4 shadow-sm">
      <h3 className="font-semibold text-foreground">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      <div className="mt-4 h-64 min-h-64">{children}</div>
    </section>
  );
}

function MonthlyTable({ data }: { data: ChartPoint[] }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-background shadow-sm" aria-labelledby="monthly-summary-title">
      <div className="border-b border-border px-4 py-3">
        <h3 id="monthly-summary-title" className="font-semibold text-foreground">Resumen mensual</h3>
        <p className="mt-1 text-sm text-muted-foreground">Valores exactos utilizados en los gráficos.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-muted/45 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-semibold">Mes</th>
              <th className="px-4 py-3 text-right font-semibold">Rendimiento</th>
              <th className="px-4 py-3 text-right font-semibold">Pedidos</th>
              <th className="px-4 py-3 text-right font-semibold">Vendido</th>
              <th className="px-4 py-3 text-right font-semibold">Recaudado</th>
              <th className="px-4 py-3 text-right font-semibold">% recaudo</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item) => (
              <tr key={item.monthKey} className="border-t border-border/70 first:border-t-0">
                <td className="whitespace-nowrap px-4 py-3 font-medium text-foreground">{item.monthLabel}</td>
                <td className="px-4 py-3 text-right font-semibold tabular-nums text-primary">{item.performanceScore}/100</td>
                <td className="px-4 py-3 text-right tabular-nums text-foreground">{item.orders}</td>
                <td className="px-4 py-3 text-right tabular-nums text-foreground">{money.format(item.soldTotal)}</td>
                <td className="px-4 py-3 text-right tabular-nums text-foreground">{money.format(item.collectedTotal)}</td>
                <td className="px-4 py-3 text-right tabular-nums text-foreground">{item.collectionRate.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

type TooltipPayload = Array<{ payload?: ChartPoint }>;

function PerformanceTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayload }) {
  const item = payload?.[0]?.payload;
  if (!active || !item) return null;
  return <ChartTooltipShell item={item}><TooltipRow label="Rendimiento" value={`${item.performanceScore}/100`} /><TooltipRow label="Pedidos" value={String(item.orders)} /><TooltipRow label="Recaudo" value={`${item.collectionRate.toFixed(1)}%`} /></ChartTooltipShell>;
}

function OrdersTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayload }) {
  const item = payload?.[0]?.payload;
  if (!active || !item) return null;
  return <ChartTooltipShell item={item}><TooltipRow label="Pedidos" value={String(item.orders)} /></ChartTooltipShell>;
}

function FinancialTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayload }) {
  const item = payload?.[0]?.payload;
  if (!active || !item) return null;
  return <ChartTooltipShell item={item}><TooltipRow label="Vendido" value={money.format(item.soldTotal)} /><TooltipRow label="Recaudado" value={money.format(item.collectedTotal)} /></ChartTooltipShell>;
}

function ChartTooltipShell({ item, children }: { item: ChartPoint; children: ReactNode }) {
  return <div className="min-w-44 rounded-xl border border-border bg-background p-3 shadow-lg"><p className="font-semibold text-foreground">{item.monthLabel}</p><div className="mt-2 space-y-1.5">{children}</div></div>;
}

function TooltipRow({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between gap-5 text-xs"><span className="text-muted-foreground">{label}</span><span className="font-semibold tabular-nums text-foreground">{value}</span></div>;
}

function AnalyticsSkeleton() {
  return <div className="space-y-4" aria-label="Cargando análisis"><div className="h-80 animate-pulse rounded-2xl bg-muted" /><div className="grid gap-4 lg:grid-cols-2"><div className="h-80 animate-pulse rounded-2xl bg-muted" /><div className="h-80 animate-pulse rounded-2xl bg-muted" /></div></div>;
}
