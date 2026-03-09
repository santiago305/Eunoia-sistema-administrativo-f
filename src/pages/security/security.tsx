import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  Ban,
  Clock3,
  RefreshCcw,
  Shield,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  ArrowRight,
  Search,
  Route,
  BarChart3,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  RadialBarChart,
  RadialBar,
} from "recharts";

import {
  getSecurityActiveBans,
  getSecurityActivitySeries,
  getSecurityMethodDistribution,
  getSecurityReasonDistribution,
  getSecurityRiskScore,
  getSecurityTopRoutes,
  getSecurityTopIps,
  blacklistSecurityIp,
  removeSecurityBlacklistIp,
} from "@/services/securityService";

import type {
  SecurityActivitySeriesItem,
  SecurityActiveBanItem,
  SecurityMethodDistributionItem,
  SecurityReasonDistributionItem,
  SecurityRiskScoreResponse,
  SecurityTopIpItem,
  SecurityTopRouteItem,
} from "./types/security.api";
import { RoutesPaths } from "@/Router/config/routesPaths";

const BRAND = "#21b8a6";

const CHART_COLORS = [
  "#21b8a6",
  "#0f172a",
  "#f59e0b",
  "#ef4444",
  "#6366f1",
  "#14b8a6",
];

const cn = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

const buildIpDetailPath = (ip: string) =>
  RoutesPaths.ipsdetails.replace(":ip", encodeURIComponent(ip));

const formatDate = (value?: string | null) => {
  if (!value) return "Sin fecha";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const getBanBadgeStyles = (banLevel?: string, permanent?: boolean) => {
  if (permanent) return "border-red-200 bg-red-50 text-red-700";
  if (banLevel === "PERMANENT") return "border-red-200 bg-red-50 text-red-700";
  if (banLevel === "TEMPORARY") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-zinc-200 bg-zinc-50 text-zinc-700";
};

function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full bg-[radial-gradient(circle_at_top_left,_rgba(33,184,166,.08),_transparent_22%),linear-gradient(to_bottom,_#fbfdfc,_#f5f7f6)]">
      <div className="mx-auto flex w-full max-w-[1550px] flex-col gap-6 px-4 py-4 md:px-6 md:py-6">
        {children}
      </div>
    </div>
  );
}

function HeaderPanel({
  hours,
  setHours,
  topLimit,
  setTopLimit,
  onRefresh,
  lastUpdated,
}: {
  hours: number;
  setHours: (value: number) => void;
  topLimit: number;
  setTopLimit: (value: number) => void;
  onRefresh: () => void;
  lastUpdated: Date | null;
}) {
  return (
    <header className="relative overflow-hidden rounded-[32px] border border-zinc-200/80 bg-white/90 p-6 shadow-[0_20px_60px_rgba(15,23,42,.06)] backdrop-blur md:p-7">
      <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-[rgba(33,184,166,.08)] blur-3xl" />
      <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
        <div className="max-w-4xl">
          <div
            className="inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-semibold"
            style={{
              borderColor: "rgba(33,184,166,.18)",
              backgroundColor: "rgba(33,184,166,.08)",
              color: BRAND,
            }}
          >
            <Shield className="h-3.5 w-3.5" />
            Centro de seguridad
          </div>

          <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-zinc-950 md:text-5xl">
            Security Dashboard
          </h1>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-600 md:text-[15px]">
            Supervisa bloqueos, actividad sospechosa, rutas más atacadas y señales de riesgo desde
            un solo panel.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3 text-xs text-zinc-500">
            <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5">
              <Activity className="h-3.5 w-3.5" />
              Polling automático cada 8s
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5">
              <Clock3 className="h-3.5 w-3.5" />
              Última actualización:
              <span className="font-medium text-zinc-700">
                {lastUpdated ? formatDate(lastUpdated.toISOString()) : " Aún no disponible"}
              </span>
            </div>
          </div>
        </div>

        <div className="grid w-full gap-3 sm:grid-cols-3 xl:w-auto">
          <select
            value={hours}
            onChange={(e) => setHours(Number(e.target.value))}
            className="h-12 rounded-2xl border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 outline-none transition focus:border-[rgba(33,184,166,.55)] focus:ring-4 focus:ring-[rgba(33,184,166,.12)]"
          >
            <option value={1}>Última 1 hora</option>
            <option value={6}>Últimas 6 horas</option>
            <option value={12}>Últimas 12 horas</option>
            <option value={24}>Últimas 24 horas</option>
            <option value={48}>Últimas 48 horas</option>
            <option value={168}>Últimos 7 días</option>
          </select>

          <select
            value={topLimit}
            onChange={(e) => setTopLimit(Number(e.target.value))}
            className="h-12 rounded-2xl border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 outline-none transition focus:border-[rgba(33,184,166,.55)] focus:ring-4 focus:ring-[rgba(33,184,166,.12)]"
          >
            <option value={10}>Top 10</option>
            <option value={20}>Top 20</option>
            <option value={50}>Top 50</option>
            <option value={100}>Top 100</option>
          </select>

          <button
            onClick={onRefresh}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-5 text-sm font-semibold text-white transition hover:opacity-90"
          >
            <RefreshCcw className="h-4 w-4" />
            Refrescar
          </button>
        </div>
      </div>
    </header>
  );
}

function StatCard({
  title,
  value,
  hint,
  icon,
  tone = "default",
}: {
  title: string;
  value: string | number;
  hint: string;
  icon: React.ReactNode;
  tone?: "default" | "success" | "warning" | "danger";
}) {
  const toneStyles = {
    default: "border-zinc-200 bg-white",
    success: "border-[rgba(33,184,166,.16)] bg-[linear-gradient(180deg,rgba(33,184,166,.08),rgba(255,255,255,1))]",
    warning: "border-amber-200 bg-[linear-gradient(180deg,rgba(251,191,36,.10),rgba(255,255,255,1))]",
    danger: "border-red-200 bg-[linear-gradient(180deg,rgba(239,68,68,.08),rgba(255,255,255,1))]",
  };

  return (
    <div
      className={cn(
        "rounded-[28px] border p-5 shadow-[0_14px_36px_rgba(15,23,42,.05)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_48px_rgba(15,23,42,.08)]",
        toneStyles[tone]
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-zinc-500">{title}</p>
          <h3 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-zinc-950 md:text-4xl">
            {value}
          </h3>
          <p className="mt-2 text-sm leading-6 text-zinc-500">{hint}</p>
        </div>

        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/50 bg-white/80 text-zinc-800 shadow-sm">
          {icon}
        </div>
      </div>
    </div>
  );
}

function SectionCard({
  title,
  subtitle,
  right,
  children,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[30px] border border-zinc-200/80 bg-white/95 shadow-[0_18px_50px_rgba(15,23,42,.05)] backdrop-blur">
      <div className="flex flex-col gap-3 border-b border-zinc-100 px-5 py-5 md:flex-row md:items-center md:justify-between md:px-6">
        <div>
          <h2 className="text-[18px] font-semibold tracking-[-0.03em] text-zinc-950">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm leading-6 text-zinc-500">{subtitle}</p> : null}
        </div>
        {right}
      </div>
      <div className="p-5 md:p-6">{children}</div>
    </section>
  );
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; name: string; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white px-3 py-2 shadow-lg">
      <p className="text-xs font-semibold text-zinc-900">{label}</p>
      <div className="mt-2 space-y-1">
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center justify-between gap-4 text-xs">
            <span className="flex items-center gap-2 text-zinc-600">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              {entry.name}
            </span>
            <span className="font-semibold text-zinc-900">{entry.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AnalyticsSection({
  activitySeries,
  reasonDistribution,
  methodDistribution,
  topRoutes,
  riskScore,
}: {
  activitySeries: SecurityActivitySeriesItem[];
  reasonDistribution: SecurityReasonDistributionItem[];
  methodDistribution: SecurityMethodDistributionItem[];
  topRoutes: SecurityTopRouteItem[];
  riskScore: SecurityRiskScoreResponse | null;
}) {
  const peakHour = useMemo(() => {
    if (activitySeries.length === 0) {
      return { label: "-", violations: 0 };
    }
    return activitySeries.reduce((prev, current) =>
      current.violations > prev.violations ? current : prev
    );
  }, [activitySeries]);

  const totalEvents = useMemo(() => {
    return activitySeries.reduce((acc, item) => acc + item.violations, 0);
  }, [activitySeries]);

  const riskValue = riskScore?.data?.score ?? 0;
  const riskLabel = riskScore?.data?.label ?? "Sin datos";

  return (
    <div className="grid gap-6">
      <div className="grid gap-6 2xl:grid-cols-[1.45fr_.95fr]">
        <SectionCard
          title="Actividad sospechosa"
          subtitle="Tendencia de eventos, bans e IPs únicas dentro del rango seleccionado."
          right={
            <div className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-600">
              Serie temporal
            </div>
          }
        >
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activitySeries}>
                <defs>
                  <linearGradient id="violationsFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#21b8a6" stopOpacity={0.22} />
                    <stop offset="95%" stopColor="#21b8a6" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="label" tick={{ fill: "#71717a", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#71717a", fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="violations"
                  stroke="#21b8a6"
                  strokeWidth={3}
                  fill="url(#violationsFill)"
                  name="Violaciones"
                />
                <Area
                  type="monotone"
                  dataKey="bans"
                  stroke="#0f172a"
                  strokeWidth={2}
                  fill="transparent"
                  name="Bans"
                />
                <Area
                  type="monotone"
                  dataKey="uniqueIps"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  fill="transparent"
                  name="IPs únicas"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-zinc-500">Pico más alto</p>
              <p className="mt-2 text-xl font-semibold text-zinc-950">{peakHour.violations}</p>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-zinc-500">Hora crítica</p>
              <p className="mt-2 text-xl font-semibold text-zinc-950">{peakHour.label}</p>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-zinc-500">Total eventos</p>
              <p className="mt-2 text-xl font-semibold text-zinc-950">{totalEvents}</p>
            </div>
          </div>
        </SectionCard>

        <div className="grid gap-6">
          <SectionCard
            title="Riesgo general"
            subtitle="Indicador consolidado de severidad del periodo."
            right={
              <div className="rounded-full border border-[rgba(33,184,166,.16)] bg-[rgba(33,184,166,.06)] px-3 py-1.5 text-xs font-medium text-[var(--brand)]"
                style={{ ["--brand" as string]: BRAND }}
              >
                Score operativo
              </div>
            }
          >
            <div className="flex flex-col items-center justify-center">
              <div className="h-[240px] w-full max-w-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart
                    innerRadius="72%"
                    outerRadius="100%"
                    data={[{ name: "Riesgo", value: riskValue }]}
                    startAngle={90}
                    endAngle={-270}
                    barSize={18}
                  >
                    <RadialBar
                      background={{ fill: "#eef2f7" }}
                      dataKey="value"
                      cornerRadius={18}
                      fill="#21b8a6"
                    />
                  </RadialBarChart>
                </ResponsiveContainer>
              </div>

              <div className="-mt-28 text-center">
                <p className="text-4xl font-semibold tracking-[-0.04em] text-zinc-950">
                  {riskValue}
                </p>
                <p className="mt-1 text-sm font-medium text-zinc-500">{riskLabel}</p>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">
              Este score puede calcularse usando bans activos, reincidencias, IPs únicas,
              crecimiento de violaciones y cantidad de rutas críticas afectadas.
            </div>
          </SectionCard>

          <SectionCard
            title="Violaciones por motivo"
            subtitle="Distribución de las causas más frecuentes."
          >
            <div className="grid gap-4 lg:grid-cols-[1fr_.9fr]">
              <div className="h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={reasonDistribution}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={70}
                      outerRadius={105}
                      paddingAngle={3}
                    >
                      {reasonDistribution.map((_, index) => (
                        <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-3">
                {reasonDistribution.map((item, index) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                      />
                      <span className="text-sm font-medium text-zinc-700">{item.label}</span>
                    </div>
                    <span className="text-sm font-semibold text-zinc-950">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </SectionCard>
        </div>
      </div>

      <div className="grid gap-6 2xl:grid-cols-[1fr_1fr]">
        <SectionCard
          title="Métodos HTTP"
          subtitle="Distribución de actividad sospechosa por método."
          right={
            <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs text-zinc-600">
              <BarChart3 className="h-3.5 w-3.5" />
              Métodos
            </div>
          }
        >
          <div className="h-[290px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={methodDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="method" tick={{ fill: "#71717a", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#71717a", fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="count" radius={[10, 10, 0, 0]} fill="#21b8a6" name="Eventos" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard
          title="Top rutas atacadas"
          subtitle="Endpoints más afectados por eventos sospechosos."
          right={
            <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs text-zinc-600">
              <Route className="h-3.5 w-3.5" />
              Rutas críticas
            </div>
          }
        >
          <div className="h-[290px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topRoutes} layout="vertical" margin={{ left: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" tick={{ fill: "#71717a", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis
                  type="category"
                  dataKey="path"
                  tick={{ fill: "#71717a", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  width={130}
                />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="count" radius={[0, 10, 10, 0]} fill="#0f172a" name="Eventos" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

function QuickActionPanel({
  onBlacklist,
  loading,
}: {
  onBlacklist: (ip: string, notes?: string) => Promise<void>;
  loading: boolean;
}) {
  const [ip, setIp] = useState("");
  const [notes, setNotes] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ip.trim()) return;
    await onBlacklist(ip.trim(), notes.trim() || undefined);
    setIp("");
    setNotes("");
  };

  return (
    <SectionCard
      title="Acciones rápidas"
      subtitle="Bloquea una IP manualmente sin entrar al detalle."
      right={
        <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(33,184,166,.16)] bg-[rgba(33,184,166,.06)] px-3 py-1.5 text-xs font-medium text-[var(--brand)]"
          style={{ ["--brand" as string]: BRAND }}
        >
          <Sparkles className="h-3.5 w-3.5" />
          Acción inmediata
        </div>
      }
    >
      <div className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
        <form
          className="grid gap-4 rounded-[24px] border border-zinc-200 bg-zinc-50/70 p-4 md:grid-cols-[1.1fr_1.4fr_auto]"
          onSubmit={handleSubmit}
        >
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
              Dirección IP
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input
                value={ip}
                onChange={(e) => setIp(e.target.value)}
                placeholder="Ej: 203.0.113.55"
                className="h-12 w-full rounded-2xl border border-zinc-200 bg-white pl-11 pr-4 text-sm text-zinc-800 outline-none transition focus:border-[var(--brand)] focus:ring-4 focus:ring-[rgba(33,184,166,.12)]"
                style={{ ["--brand" as string]: BRAND }}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
              Motivo
            </label>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: actividad anómala detectada"
              className="h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm text-zinc-800 outline-none transition focus:border-[var(--brand)] focus:ring-4 focus:ring-[rgba(33,184,166,.12)]"
              style={{ ["--brand" as string]: BRAND }}
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 md:w-auto"
            >
              <Ban className="h-4 w-4" />
              {loading ? "Bloqueando..." : "Blacklist manual"}
            </button>
          </div>
        </form>

        <div className="rounded-[24px] border border-[rgba(33,184,166,.16)] bg-[linear-gradient(180deg,rgba(33,184,166,.08),rgba(255,255,255,1))] p-5">
          <p className="text-sm font-semibold text-zinc-950">Este bloque puede crecer con:</p>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-zinc-600">
            <li>• exportación de auditoría</li>
            <li>• pausa de polling</li>
            <li>• filtro por motivo</li>
            <li>• score de riesgo por IP</li>
          </ul>
        </div>
      </div>
    </SectionCard>
  );
}

function TopIpRow({
  item,
  onClick,
}: {
  item: SecurityTopIpItem;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group flex w-full items-center justify-between rounded-[22px] border border-zinc-200 bg-white px-4 py-4 text-left transition hover:border-[rgba(33,184,166,.30)] hover:bg-[rgba(33,184,166,.03)] hover:shadow-[0_12px_28px_rgba(15,23,42,.05)]"
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full bg-[var(--brand)]" style={{ ["--brand" as string]: BRAND }} />
          <p className="truncate text-sm font-semibold text-zinc-900 md:text-[15px]">{item.ip}</p>
        </div>

        <p className="mt-2 text-xs text-zinc-500">
          Última violación: {formatDate(item.lastViolationAt)}
        </p>
      </div>

      <div className="ml-4 flex items-center gap-3">
        <div className="rounded-full border border-zinc-200 bg-zinc-950 px-3 py-1.5 text-xs font-semibold text-white">
          {item.violations} eventos
        </div>
        <ArrowRight className="h-4 w-4 text-zinc-400 transition group-hover:translate-x-0.5 group-hover:text-zinc-700" />
      </div>
    </button>
  );
}

export default function SecurityPage() {
  const navigate = useNavigate();

  const [topIps, setTopIps] = useState<SecurityTopIpItem[]>([]);
  const [activeBans, setActiveBans] = useState<SecurityActiveBanItem[]>([]);
  const [activitySeries, setActivitySeries] = useState<SecurityActivitySeriesItem[]>([]);
  const [reasonDistribution, setReasonDistribution] = useState<SecurityReasonDistributionItem[]>([]);
  const [methodDistribution, setMethodDistribution] = useState<SecurityMethodDistributionItem[]>([]);
  const [topRoutes, setTopRoutes] = useState<SecurityTopRouteItem[]>([]);
  const [riskScore, setRiskScore] = useState<SecurityRiskScoreResponse | null>(null);
  const [hours, setHours] = useState(24);
  const [topLimit, setTopLimit] = useState(20);
  const [loading, setLoading] = useState(true);
  const [mutating, setMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchAll = async () => {
    try {
      setError(null);
      setLoading(true);

      const seriesGroupBy = hours > 48 ? "day" : "hour";
      const [ips, bans, activity, reasons, methods, routes, risk] = await Promise.all([
        getSecurityTopIps({ hours, limit: topLimit }),
        getSecurityActiveBans(),
        getSecurityActivitySeries({ hours, groupBy: seriesGroupBy }),
        getSecurityReasonDistribution({ hours }),
        getSecurityMethodDistribution({ hours }),
        getSecurityTopRoutes({ hours, limit: 5 }),
        getSecurityRiskScore({ hours }),
      ]);

      setTopIps(ips);
      setActiveBans(bans);
      setActivitySeries(activity.data);
      setReasonDistribution(reasons.data);
      setMethodDistribution(methods.data);
      setTopRoutes(routes.data);
      setRiskScore(risk);
      setLastUpdated(new Date());
    } catch (err) {
      console.error(err);
      setError("No se pudo cargar la información de seguridad.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, [hours, topLimit]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      fetchAll();
    }, 8000);

    return () => window.clearInterval(interval);
  }, [hours, topLimit]);

  const stats = useMemo(() => {
    const temporary = activeBans.filter(
      (item) => !item.manualPermanentBan && item.banLevel === "TEMPORARY"
    ).length;

    const permanent = activeBans.filter(
      (item) => item.manualPermanentBan || item.banLevel === "PERMANENT"
    ).length;

    const totalViolations = topIps.reduce((acc, item) => acc + item.violations, 0);

    return {
      temporary,
      permanent,
      totalViolations,
      totalBans: activeBans.length,
    };
  }, [activeBans, topIps]);

  const handleBlacklist = async (ip: string, notes?: string) => {
    try {
      setMutating(true);
      await blacklistSecurityIp({ ip, notes });
      await fetchAll();
    } catch (err) {
      console.error(err);
      setError("No se pudo bloquear la IP manualmente.");
    } finally {
      setMutating(false);
    }
  };

  const handleUnban = async (ip: string) => {
    try {
      setMutating(true);
      await removeSecurityBlacklistIp(ip);
      await fetchAll();
    } catch (err) {
      console.error(err);
      setError("No se pudo quitar el bloqueo de la IP.");
    } finally {
      setMutating(false);
    }
  };

  return (
    <DashboardShell>
      <HeaderPanel
        hours={hours}
        setHours={setHours}
        topLimit={topLimit}
        setTopLimit={setTopLimit}
        onRefresh={fetchAll}
        lastUpdated={lastUpdated}
      />

      {error ? (
        <div className="rounded-[24px] border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 shadow-sm">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
        <StatCard
          title="Bans activos"
          value={stats.totalBans}
          hint="IPs bloqueadas actualmente"
          icon={<ShieldAlert className="h-5 w-5" />}
          tone="danger"
        />
        <StatCard
          title="Temporales"
          value={stats.temporary}
          hint="Baneos con vencimiento"
          icon={<Clock3 className="h-5 w-5" />}
          tone="warning"
        />
        <StatCard
          title="Permanentes"
          value={stats.permanent}
          hint="Bloqueos manuales o permanentes"
          icon={<Ban className="h-5 w-5" />}
          tone="default"
        />
        <StatCard
          title="Violaciones top"
          value={stats.totalViolations}
          hint="Suma visible del ranking actual"
          icon={<TrendingUp className="h-5 w-5" />}
          tone="success"
        />
      </div>

      <AnalyticsSection
        activitySeries={activitySeries}
        reasonDistribution={reasonDistribution}
        methodDistribution={methodDistribution}
        topRoutes={topRoutes}
        riskScore={riskScore}
      />

      <QuickActionPanel onBlacklist={handleBlacklist} loading={mutating} />

      <div className="grid gap-6 2xl:grid-cols-[0.95fr_1.45fr]">
        <SectionCard
          title="Top IPs"
          subtitle="IPs con mayor número de violaciones en el rango seleccionado."
        >
          {loading ? (
            <div className="grid gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-[74px] animate-pulse rounded-[22px] bg-zinc-100" />
              ))}
            </div>
          ) : topIps.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-zinc-200 bg-zinc-50 p-10 text-center text-sm text-zinc-500">
              No hay IPs con actividad registrada para este rango.
            </div>
          ) : (
            <div className="space-y-3">
              {topIps.map((item, index) => (
                <TopIpRow
                  key={`${item.ip}-${index}`}
                  item={item}
                  onClick={() => navigate(buildIpDetailPath(item.ip))}
                />
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Bans activos"
          subtitle="Bloqueos aplicados de forma automática o manual."
        >
          {loading ? (
            <div className="grid gap-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-[88px] animate-pulse rounded-[22px] bg-zinc-100" />
              ))}
            </div>
          ) : activeBans.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-zinc-200 bg-zinc-50 p-10 text-center text-sm text-zinc-500">
              No hay bans activos en este momento.
            </div>
          ) : (
            <div className="overflow-hidden rounded-[24px] border border-zinc-200">
              <div className="overflow-x-auto">
                <table className="min-w-full text-left">
                  <thead className="bg-zinc-50">
                    <tr className="text-xs uppercase tracking-[0.12em] text-zinc-500">
                      <th className="px-5 py-4 font-semibold">IP</th>
                      <th className="px-5 py-4 font-semibold">Nivel</th>
                      <th className="px-5 py-4 font-semibold">Hasta</th>
                      <th className="px-5 py-4 font-semibold">Motivo</th>
                      <th className="px-5 py-4 font-semibold text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {activeBans.map((item) => (
                      <tr key={item.ip} className="border-t border-zinc-100 transition hover:bg-zinc-50/60">
                        <td className="px-5 py-4">
                          <button
                            onClick={() => navigate(buildIpDetailPath(item.ip))}
                            className="text-sm font-semibold text-zinc-900 transition hover:text-[var(--brand)]"
                            style={{ ["--brand" as string]: BRAND }}
                          >
                            {item.ip}
                          </button>
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={cn(
                              "inline-flex rounded-full border px-3 py-1.5 text-xs font-semibold",
                              getBanBadgeStyles(item.banLevel, item.manualPermanentBan)
                            )}
                          >
                            {item.manualPermanentBan ? "MANUAL PERMANENTE" : item.banLevel}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-sm text-zinc-600">
                          {item.manualPermanentBan ? "Sin vencimiento" : formatDate(item.bannedUntil)}
                        </td>

                        <td className="max-w-[280px] px-5 py-4 text-sm text-zinc-600">
                          <div className="line-clamp-2">{item.notes?.trim() || "Sin detalle"}</div>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => navigate(buildIpDetailPath(item.ip))}
                              className="rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50"
                            >
                              Ver detalle
                            </button>
                            <button
                              onClick={() => handleUnban(item.ip)}
                              disabled={mutating}
                              className="rounded-xl bg-zinc-950 px-3.5 py-2 text-xs font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Unban
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </SectionCard>
      </div>
    </DashboardShell>
  );
}



