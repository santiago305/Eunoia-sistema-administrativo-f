import { lazy, memo, Suspense, useMemo } from "react";
import { Activity } from "lucide-react";
import type {
  SecurityActivitySeriesItem,
  SecurityMethodDistributionItem,
  SecurityReasonDistributionItem,
  SecurityRiskScoreResponse,
  SecurityTopRouteItem,
} from "../../types/security.api";
import { ActivitySeriesChart } from "../charts/ActivitySeriesChart";
import { SectionCard } from "../SectionCard";
import { SystemButton } from "@/shared/components/components/SystemButton";


const ReasonDistributionChart = lazy(async () => {
  const module = await import("../charts/ReasonDistributionChart");
  return { default: module.ReasonDistributionChart };
});
const MethodDistributionChart = lazy(async () => {
  const module = await import("../charts/MethodDistributionChart");
  return { default: module.MethodDistributionChart };
});
const TopRoutesChart = lazy(async () => {
  const module = await import("../charts/TopRoutesChart");
  return { default: module.TopRoutesChart };
});
const RiskScoreChart = lazy(async () => {
  const module = await import("../charts/RiskScoreChart");
  return { default: module.RiskScoreChart };
});

function ChartSkeleton() {
  return <div className="h-[220px] animate-pulse rounded-2xl bg-zinc-100/80" />;
}

export const AnalyticsSection = memo(function AnalyticsSection({
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
  const hasReasonDistribution = reasonDistribution.length > 0;
  const hasMethodDistribution = methodDistribution.length > 0;
  const hasTopRoutes = topRoutes.length > 0;
  const hasSecondaryCharts = hasReasonDistribution || hasMethodDistribution || hasTopRoutes;

  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 mb-4">
          <SectionCard title="Actividad sospechosa" subtitle="Tendencia de eventos en el rango seleccionado" className="lg:col-span-3">

          <ActivitySeriesChart data={activitySeries} />
          <div className="grid grid-cols-3 gap-3 mt-3 pt-3 border-t border-border">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Pico máx. auto</p>
              <p className="text-sm font-semibold font-mono-tight text-foreground">{peakHour.violations}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Hora crítica</p>
              <p className="text-sm font-semibold font-mono-tight text-foreground">{peakHour.label}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Total eventos</p>
              <p className="text-sm font-semibold font-mono-tight text-foreground">{totalEvents}</p>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Riesgo general"
          subtitle="Indicador consolidado del período"
          className="lg:col-span-2"
          action={
            <SystemButton 
            size="sm" 
            variant="outline" 
            className="h-6 text-xs gap-1"
            leftIcon={<Activity className="h-3 w-3" />}>
              Score histórico
            </SystemButton>
          }
        >
          <div className="flex items-center justify-center py-1">
            <Suspense fallback={<ChartSkeleton />}>
              <RiskScoreChart value={riskValue} label={riskLabel} />
            </Suspense>
          </div>

          <div className="mt-2 rounded-2xl border border-zinc-200 bg-gradient-to-b from-zinc-50 to-white p-4">
            <p className="text-xs leading-6 text-zinc-600">
              Este score se construye a partir de señales como bans activos, reincidencias, IPs
              únicas, crecimiento de violaciones y rutas críticas afectadas.
            </p>
          </div>
        </SectionCard>
      </div>

      {hasSecondaryCharts && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          {hasReasonDistribution && (
            <SectionCard
              title="Causas principales"
              subtitle="Distribucion de alertas por tipo."
            >
              <Suspense fallback={<ChartSkeleton />}>
                <ReasonDistributionChart data={reasonDistribution} />
              </Suspense>
            </SectionCard>
          )}

          {hasMethodDistribution && (
            <SectionCard
              title="Metodos HTTP"
              subtitle="Distribucion de actividad sospechosa por metodo."
            >
              <Suspense fallback={<ChartSkeleton />}>
                <MethodDistributionChart data={methodDistribution} />
              </Suspense>
            </SectionCard>
          )}

          {hasTopRoutes && (
            <SectionCard
              title="Top rutas atacadas"
              subtitle="Endpoints mas afectados por eventos sospechosos."
            >
              <Suspense fallback={<ChartSkeleton />}>
                <TopRoutesChart data={topRoutes} />
              </Suspense>
            </SectionCard>
          )}
        </div>
      )}
    </div>
  );
});
