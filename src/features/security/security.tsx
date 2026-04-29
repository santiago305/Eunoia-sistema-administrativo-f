import { startTransition, useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, AlertTriangle, Ban, Clock } from "lucide-react";

import {
  getSecurityActiveBans,
  getSecurityActivitySeries,
  getSecurityReasons,
  getSecurityRiskScoreByIp,
  getSecurityMethodDistribution,
  getSecurityReasonDistribution,
  getSecurityRiskScore,
  getSecuritySummary,
  getSecurityTopRoutes,
  getSecurityTopIps,
  blacklistSecurityIp,
  exportSecurityAudit,
} from "@/shared/services/securityService";
import { useFlashMessage } from "@/shared/hooks/useFlashMessage";
import { errorResponse, infoResponse, successResponse } from "@/shared/common/utils/response";

import type {
  SecurityActivitySeriesItem,
  SecurityActiveBanItem,
  SecurityMethodDistributionItem,
  SecurityReasonCatalogItem,
  SecurityReasonDistributionItem,
  SecurityRiskScoreByIpResponse,
  SecurityRiskScoreResponse,
  SecurityTopIpItem,
  SecurityTopRouteItem,
} from "./types/security.api";
import { DashboardShell } from "./components/DashboardShell";
import { HeaderPanel } from "./components/HeaderPanel";
import { StatCard } from "./components/StatCard";
import { ActiveBansSection } from "./components/sections/ActiveBansSection";
import { AnalyticsSection } from "./components/sections/AnalyticsSection";
import { QuickActionPanel } from "./components/sections/QuickActionPanel";
import { TopIpsSection } from "./components/sections/TopIpsSection";

type FetchSecurityOptions = {
  preserveContent?: boolean;
};

export default function SecurityPage() {
  const navigate = useNavigate();
  const { showFlash } = useFlashMessage();
  type SecuritySummary = Awaited<ReturnType<typeof getSecuritySummary>>;

  const [topIps, setTopIps] = useState<SecurityTopIpItem[]>([]);
  const [activeBans, setActiveBans] = useState<SecurityActiveBanItem[]>([]);
  const [activeBansPage, setActiveBansPage] = useState(1);
  const [activeBansLimit, setActiveBansLimit] = useState(10);
  const [activeBansTotal, setActiveBansTotal] = useState(0);
  const [activitySeries, setActivitySeries] = useState<SecurityActivitySeriesItem[]>([]);
  const [reasonDistribution, setReasonDistribution] = useState<SecurityReasonDistributionItem[]>([]);
  const [methodDistribution, setMethodDistribution] = useState<SecurityMethodDistributionItem[]>([]);
  const [topRoutes, setTopRoutes] = useState<SecurityTopRouteItem[]>([]);
  const [reasonCatalog, setReasonCatalog] = useState<SecurityReasonCatalogItem[]>([]);
  const [riskScore, setRiskScore] = useState<SecurityRiskScoreResponse | null>(null);
  const [summary, setSummary] = useState<SecuritySummary | null>(null);
  const [hours, setHours] = useState(24);
  const [topLimit, setTopLimit] = useState(20);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [bansLoading, setBansLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [mutating, setMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [pollingPaused, setPollingPaused] = useState(false);
  const [isDocumentVisible, setIsDocumentVisible] = useState(
    () => (typeof document === "undefined" ? true : !document.hidden),
  );
  const [reasonFilter, setReasonFilter] = useState("");
  const [auditExporting, setAuditExporting] = useState(false);
  const [ipRiskLoading, setIpRiskLoading] = useState(false);
  const [ipRiskResult, setIpRiskResult] = useState<SecurityRiskScoreByIpResponse | null>(null);
  const [hasLoadedDashboard, setHasLoadedDashboard] = useState(false);
  const [hasLoadedBans, setHasLoadedBans] = useState(false);

  const fetchDashboardData = useCallback(async ({ preserveContent = false }: FetchSecurityOptions = {}) => {
    try {
      setError(null);
      if (preserveContent && hasLoadedDashboard) {
        setRefreshing(true);
      } else {
        setDashboardLoading(true);
      }

      const [summaryData, ips, activity, reasons, methods, routes, risk, catalog] = await Promise.all([
        getSecuritySummary({ hours, reason: reasonFilter || undefined }),
        getSecurityTopIps({ hours, limit: topLimit, reason: reasonFilter || undefined }),
        getSecurityActivitySeries({ hours, reason: reasonFilter || undefined }),
        getSecurityReasonDistribution({ hours }),
        getSecurityMethodDistribution({ hours, reason: reasonFilter || undefined }),
        getSecurityTopRoutes({ hours, limit: 5, reason: reasonFilter || undefined }),
        getSecurityRiskScore({ hours }),
        getSecurityReasons({ hours, activeOnly: true }).catch(() => []),
      ]);

      setSummary(summaryData);
      setTopIps(ips);
      setActivitySeries(activity.data);
      setReasonDistribution(reasons.data);
      setMethodDistribution(methods.data);
      setTopRoutes(routes.data);
      setRiskScore(risk);
      setReasonCatalog(catalog);
      setLastUpdated(new Date());
      setHasLoadedDashboard(true);
    } catch (err) {
      console.error(err);
      setError("No se pudo cargar la informacion de seguridad.");
    } finally {
      setDashboardLoading(false);
      setRefreshing(false);
    }
  }, [hasLoadedDashboard, hours, reasonFilter, topLimit]);

  const fetchActiveBansPage = useCallback(async ({ preserveContent = false }: FetchSecurityOptions = {}) => {
    try {
      setError(null);
      if (!preserveContent || !hasLoadedBans) {
        setBansLoading(true);
      }

      const bans = await getSecurityActiveBans({ page: activeBansPage, limit: activeBansLimit });
      setActiveBans(bans.data);
      setActiveBansPage(bans.pagination?.page ?? 1);
      setActiveBansLimit(bans.pagination?.limit ?? Math.max(bans.data.length, 1));
      setActiveBansTotal(bans.pagination?.total ?? bans.data.length);
      setHasLoadedBans(true);
    } catch (err) {
      console.error(err);
      setError("No se pudo cargar la informacion de seguridad.");
    } finally {
      setBansLoading(false);
    }
  }, [activeBansLimit, activeBansPage, hasLoadedBans]);

  const fetchAll = useCallback(async (options: FetchSecurityOptions = {}) => {
    await Promise.all([fetchDashboardData(options), fetchActiveBansPage(options)]);
  }, [fetchActiveBansPage, fetchDashboardData]);

  useEffect(() => {
    void fetchDashboardData();
  }, [fetchDashboardData]);

  useEffect(() => {
    void fetchActiveBansPage();
  }, [fetchActiveBansPage]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsDocumentVisible(!document.hidden);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  useEffect(() => {
    if (pollingPaused || !isDocumentVisible) return;

    const interval = window.setInterval(() => {
      void fetchAll({ preserveContent: true });
    }, 20000);

    return () => window.clearInterval(interval);
  }, [fetchAll, isDocumentVisible, pollingPaused]);

  const handleBlacklist = async (ip: string, notes?: string) => {
    try {
      setMutating(true);
      await blacklistSecurityIp({ ip, notes });
      await Promise.all([
        fetchDashboardData({ preserveContent: true }),
        fetchActiveBansPage({ preserveContent: true }),
      ]);
    } catch (err) {
      console.error(err);
      setError("No se pudo bloquear la IP manualmente.");
    } finally {
      setMutating(false);
    }
  };

  const handleExportAudit = async () => {
    try {
      setAuditExporting(true);
      const blob = await exportSecurityAudit({
        hours,
        reason: reasonFilter || undefined,
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `security-audit-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      showFlash(successResponse("Exportacion de auditoria completada."));
    } catch (err) {
      console.error(err);
      showFlash(errorResponse("No se pudo exportar la auditoria."));
    } finally {
      setAuditExporting(false);
    }
  };

  const handleTogglePolling = () => {
    setPollingPaused((prev) => {
      const next = !prev;
      showFlash(infoResponse(next ? "Polling pausado." : "Polling reanudado."));
      return next;
    });
  };

  const handleLookupIpRisk = async (ip: string) => {
    try {
      setIpRiskLoading(true);
      const result = await getSecurityRiskScoreByIp(ip, { hours });
      setIpRiskResult(result);
      showFlash(successResponse(`Riesgo consultado para ${result.ip}.`));
    } catch (err) {
      console.error(err);
      setIpRiskResult(null);
      showFlash(errorResponse("No se pudo consultar el score de riesgo por IP."));
    } finally {
      setIpRiskLoading(false);
    }
  };

  const handleRefresh = useCallback(() => {
    if (refreshing) return;
    void fetchAll({ preserveContent: true });
  }, [fetchAll, refreshing]);

  const handleReasonChange = useCallback((reason: string) => {
    startTransition(() => {
      setReasonFilter(reason);
    });
  }, []);

  const reasonOptions = useMemo(() => {
    if (reasonCatalog.length > 0) {
      return reasonCatalog
        .filter((item) => item.active)
        .map((item) => ({ value: item.key, label: item.label }))
        .sort((a, b) => a.label.localeCompare(b.label));
    }

    const map = new Map<string, string>();
    reasonDistribution.forEach((item) => {
      const value = item.key || item.name || item.label;
      if (!value) return;
      if (!map.has(value)) {
        map.set(value, item.label || item.name || value);
      }
    });
    return Array.from(map.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [reasonCatalog, reasonDistribution]);

  useEffect(() => {
    if (!reasonFilter) return;
    if (!reasonOptions.some((option) => option.value === reasonFilter)) {
      setReasonFilter("");
    }
  }, [reasonFilter, reasonOptions]);

  return (
    <DashboardShell>
      <HeaderPanel
        hours={hours}
        setHours={setHours}
        topLimit={topLimit}
        setTopLimit={setTopLimit}
        onRefresh={handleRefresh}
        refreshing={refreshing}
        lastUpdated={lastUpdated}
      />

      {error ? (
        <div className="rounded-[24px] border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 shadow-sm">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <StatCard
          label="Bans activos"
          value={summary?.data.activeBans ?? 0}
          subtitle="IPs bloqueadas actualmente"
          icon={Ban}
          variant="primary"
        />
        <StatCard
          label="Temporales"
          value={summary?.data.temporaryBans ?? 0}
          subtitle="Baneos con vencimiento"
          icon={Clock}
        />
        <StatCard
          label="Permanentes"
          value={summary?.data.permanentBans ?? 0}
          subtitle="Bloqueos manuales o permanentes"
          icon={AlertTriangle}
          variant="warning"
        />
        <StatCard
          label="Violaciones top"
          value={summary?.data.topViolations ?? 0}
          subtitle="Suma visible del ranking actual"
          icon={Activity}
          variant="destructive"
        />
      </div>

      <AnalyticsSection
        activitySeries={activitySeries}
        reasonDistribution={reasonDistribution}
        methodDistribution={methodDistribution}
        topRoutes={topRoutes}
        riskScore={riskScore}
      />

      <QuickActionPanel
        onBlacklist={handleBlacklist}
        loading={mutating}
        pollingPaused={pollingPaused}
        onTogglePolling={handleTogglePolling}
        reasonOptions={reasonOptions}
        selectedReason={reasonFilter}
        onReasonChange={handleReasonChange}
        onExportAudit={handleExportAudit}
        exportLoading={auditExporting}
        onLookupIpRisk={handleLookupIpRisk}
        ipRiskLoading={ipRiskLoading}
        ipRiskResult={ipRiskResult}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
        <TopIpsSection
          loading={dashboardLoading}
          topIps={topIps}
        />

        <ActiveBansSection
          loading={bansLoading}
          activeBans={activeBans}
          pagination={{ page: activeBansPage, limit: activeBansLimit, total: activeBansTotal }}
          onNavigate={navigate}
          onPageChange={setActiveBansPage}
        />
      </div>
    </DashboardShell>
  );
}
