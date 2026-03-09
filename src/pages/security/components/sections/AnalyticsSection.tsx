import { BarChart3, Route } from "lucide-react";
import { useMemo } from "react";

import type {
  SecurityActivitySeriesItem,
  SecurityMethodDistributionItem,
  SecurityReasonDistributionItem,
  SecurityRiskScoreResponse,
  SecurityTopRouteItem,
} from "../../types/security.api";
import { BRAND } from "../security.utils";
import { ActivitySeriesChart } from "../charts/ActivitySeriesChart";
import { MethodDistributionChart } from "../charts/MethodDistributionChart";
import { ReasonDistributionChart } from "../charts/ReasonDistributionChart";
import { RiskScoreChart } from "../charts/RiskScoreChart";
import { TopRoutesChart } from "../charts/TopRoutesChart";
import { SectionCard } from "../SectionCard";

export function AnalyticsSection({
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

  const totalEvents = useMemo(
    () => activitySeries.reduce((acc, item) => acc + item.violations, 0),
    [activitySeries]
  );

  const riskValue = riskScore?.data?.score ?? 0;
  const riskLabel = riskScore?.data?.label ?? "Sin datos";

  return (
    <div className="grid gap-6">
      <div className="grid gap-6 2xl:grid-cols-[1.45fr_.95fr]">
        <SectionCard
          title="Actividad sospechosa"
          subtitle="Tendencia de eventos, bans e IPs unicas dentro del rango seleccionado."
          right={
            <div className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-600">
              Serie temporal
            </div>
          }
        >
          <ActivitySeriesChart data={activitySeries} />

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-zinc-500">Pico mas alto</p>
              <p className="mt-2 text-xl font-semibold text-zinc-950">{peakHour.violations}</p>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-zinc-500">Hora critica</p>
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
              <div
                className="inline-flex items-center gap-2 rounded-full border border-[rgba(33,184,166,.14)] bg-[rgba(33,184,166,.07)] px-3 py-1.5 text-xs font-medium text-[var(--brand)] shadow-sm"
                style={{ ["--brand" as string]: BRAND }}
              >
                <span className="h-2 w-2 rounded-full bg-[var(--brand)]" />
                Score operativo
              </div>
            }
          >
            <div className="flex items-center justify-center py-1">
              <RiskScoreChart value={riskValue} label={riskLabel} />
            </div>

            <div className="mt-2 rounded-2xl border border-zinc-200 bg-gradient-to-b from-zinc-50 to-white p-4">
              <p className="text-sm leading-6 text-zinc-600">
                Este score se construye a partir de señales como bans activos, reincidencias,
                IPs únicas, crecimiento de violaciones y rutas críticas afectadas.
              </p>
            </div>
          </SectionCard>

          <SectionCard
            title="Violaciones por motivo"
            subtitle="Distribucion de las causas mas frecuentes."
          >
            <ReasonDistributionChart data={reasonDistribution} />
          </SectionCard>
        </div>
      </div>

      <div className="grid gap-6 2xl:grid-cols-[1fr_1fr]">
        <SectionCard
          title="Metodos HTTP"
          subtitle="Distribucion de actividad sospechosa por metodo."
          right={
            <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs text-zinc-600">
              <BarChart3 className="h-3.5 w-3.5" />
              Metodos
            </div>
          }
        >
          <MethodDistributionChart data={methodDistribution} />
        </SectionCard>

        <SectionCard
          title="Top rutas atacadas"
          subtitle="Endpoints mas afectados por eventos sospechosos."
          right={
            <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs text-zinc-600">
              <Route className="h-3.5 w-3.5" />
              Rutas criticas
            </div>
          }
        >
          <TopRoutesChart data={topRoutes} />
        </SectionCard>
      </div>
    </div>
  );
}
