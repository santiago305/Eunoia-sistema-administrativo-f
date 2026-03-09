import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Ban, Clock3, ShieldAlert, TrendingUp } from "lucide-react";

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
import { DashboardShell } from "./components/DashboardShell";
import { HeaderPanel } from "./components/HeaderPanel";
import { StatCard } from "./components/StatCard";
import { ActiveBansSection } from "./components/sections/ActiveBansSection";
import { AnalyticsSection } from "./components/sections/AnalyticsSection";
import { QuickActionPanel } from "./components/sections/QuickActionPanel";
import { TopIpsSection } from "./components/sections/TopIpsSection";
import { buildIpDetailPath } from "./components/security.utils";

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
      setError("No se pudo cargar la informacion de seguridad.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchAll();
  }, [hours, topLimit]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      void fetchAll();
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
        onRefresh={() => void fetchAll()}
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
        <TopIpsSection
          loading={loading}
          topIps={topIps}
          onSelectIp={(ip) => navigate(buildIpDetailPath(ip))}
        />

        <ActiveBansSection
          loading={loading}
          activeBans={activeBans}
          mutating={mutating}
          onNavigate={navigate}
          onUnban={handleUnban}
        />
      </div>
    </DashboardShell>
  );
}
