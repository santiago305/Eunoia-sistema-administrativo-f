import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { RoutesPaths } from "@/router/config/routesPaths";

import {
  getSecurityActiveBans,
  getSecurityTopIps,
  blacklistSecurityIp,
  removeSecurityBlacklistIp,
} from "@/services/securityService";

import type {
  SecurityActiveBanItem,
  SecurityTopIpItem,
} from "./types/security.api";

const BRAND = "#21b8a6";

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
  if (permanent) {
    return "border-red-200 bg-red-50 text-red-700";
  }
  if (banLevel === "PERMANENT") {
    return "border-red-200 bg-red-50 text-red-700";
  }
  if (banLevel === "TEMPORARY") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  return "border-zinc-200 bg-zinc-50 text-zinc-700";
};

function StatCard({
  title,
  value,
  hint,
}: {
  title: string;
  value: string | number;
  hint: string;
}) {
  return (
    <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-[0_10px_30px_rgba(0,0,0,.04)]">
      <p className="text-sm font-medium text-zinc-500">{title}</p>
      <h3 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-900">
        {value}
      </h3>
      <p className="mt-2 text-sm text-zinc-500">{hint}</p>
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
    <section className="rounded-3xl border border-zinc-200 bg-white shadow-[0_10px_30px_rgba(0,0,0,.04)]">
      <div className="flex flex-col gap-3 border-b border-zinc-100 p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm text-zinc-500">{subtitle}</p> : null}
        </div>
        {right}
      </div>
      <div className="p-5">{children}</div>
    </section>
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
      subtitle="Bloquea una IP manualmente sin tener que entrar al detalle."
    >
      <form className="grid gap-4 md:grid-cols-[1.2fr_1.8fr_auto]" onSubmit={handleSubmit}>
        <input
          value={ip}
          onChange={(e) => setIp(e.target.value)}
          placeholder="Ej: 203.0.113.55"
          className="h-12 rounded-2xl border border-zinc-200 bg-white px-4 text-sm text-zinc-800 outline-none transition focus:border-[var(--brand)] focus:ring-4 focus:ring-[rgba(33,184,166,.12)]"
          style={{ ["--brand" as string]: BRAND }}
        />
        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Motivo opcional"
          className="h-12 rounded-2xl border border-zinc-200 bg-white px-4 text-sm text-zinc-800 outline-none transition focus:border-[var(--brand)] focus:ring-4 focus:ring-[rgba(33,184,166,.12)]"
          style={{ ["--brand" as string]: BRAND }}
        />
        <button
          type="submit"
          disabled={loading}
          className="h-12 rounded-2xl bg-zinc-900 px-5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Bloqueando..." : "Blacklist manual"}
        </button>
      </form>

      <div className="mt-4 rounded-2xl border border-[rgba(33,184,166,.18)] bg-[rgba(33,184,166,.06)] p-4 text-sm text-zinc-700">
        <p className="font-medium text-zinc-900">Espacio recomendado</p>
        <p className="mt-1">
          Aquí luego puedes agregar accesos a auditoría exportable, filtros por rango de horas,
          contador de reincidencias por IP y un botón para pausar el polling.
        </p>
      </div>
    </SectionCard>
  );
}

export default function SecurityPage() {
  const navigate = useNavigate();

  const [topIps, setTopIps] = useState<SecurityTopIpItem[]>([]);
  const [activeBans, setActiveBans] = useState<SecurityActiveBanItem[]>([]);
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

      const [ips, bans] = await Promise.all([
        getSecurityTopIps({ hours, limit: topLimit }),
        getSecurityActiveBans(),
      ]);

      setTopIps(ips);
      setActiveBans(bans);
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
    <div className="min-h-full bg-[#f8faf9]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 md:p-6">
        <header className="rounded-[28px] border border-zinc-200 bg-white p-6 shadow-[0_10px_30px_rgba(0,0,0,.04)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div
                className="inline-flex rounded-full border px-3 py-1 text-xs font-semibold"
                style={{
                  borderColor: "rgba(33,184,166,.20)",
                  backgroundColor: "rgba(33,184,166,.07)",
                  color: BRAND,
                }}
              >
                Seguridad del sistema
              </div>

              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-zinc-950 md:text-4xl">
                Security Dashboard
              </h1>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-600">
                Monitorea intentos sospechosos, bloqueos activos y comportamiento por IP en tiempo
                casi real. Bonito nombre para decir “veamos quién está fastidiando hoy”.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <select
                value={hours}
                onChange={(e) => setHours(Number(e.target.value))}
                className="h-11 rounded-2xl border border-zinc-200 bg-white px-4 text-sm text-zinc-700 outline-none focus:border-[rgba(33,184,166,.6)]"
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
                className="h-11 rounded-2xl border border-zinc-200 bg-white px-4 text-sm text-zinc-700 outline-none focus:border-[rgba(33,184,166,.6)]"
              >
                <option value={10}>Top 10</option>
                <option value={20}>Top 20</option>
                <option value={50}>Top 50</option>
                <option value={100}>Top 100</option>
              </select>

              <button
                onClick={fetchAll}
                className="h-11 rounded-2xl bg-zinc-900 px-5 text-sm font-semibold text-white transition hover:opacity-90"
              >
                Refrescar
              </button>
            </div>
          </div>

          <div className="mt-4 text-xs text-zinc-500">
            Última actualización: {lastUpdated ? formatDate(lastUpdated.toISOString()) : "Aún no disponible"}
          </div>
        </header>

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Bans activos"
            value={stats.totalBans}
            hint="IPs actualmente bloqueadas"
          />
          <StatCard
            title="Temporales"
            value={stats.temporary}
            hint="Baneos con vencimiento"
          />
          <StatCard
            title="Permanentes"
            value={stats.permanent}
            hint="Manual o nivel permanente"
          />
          <StatCard
            title="Violaciones top"
            value={stats.totalViolations}
            hint="Suma del ranking visible"
          />
        </div>

        <QuickActionPanel onBlacklist={handleBlacklist} loading={mutating} />

        <div className="grid gap-6 xl:grid-cols-[1.05fr_1.35fr]">
          <SectionCard
            title="Top IPs"
            subtitle="IPs con más violaciones dentro del rango seleccionado."
            right={
              <div className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs text-zinc-600">
                {topIps.length} registros
              </div>
            }
          >
            {loading ? (
              <div className="grid gap-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-16 animate-pulse rounded-2xl bg-zinc-100" />
                ))}
              </div>
            ) : topIps.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-8 text-center text-sm text-zinc-500">
                No hay IPs con actividad registrada para este rango.
              </div>
            ) : (
              <div className="space-y-3">
                {topIps.map((item, index) => (
                  <button
                    key={`${item.ip}-${index}`}
                    onClick={() => navigate(buildIpDetailPath(item.ip))}
                    className="flex w-full items-center justify-between rounded-2xl border border-zinc-200 bg-white p-4 text-left transition hover:border-[rgba(33,184,166,.35)] hover:bg-[rgba(33,184,166,.03)]"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-zinc-900">{item.ip}</p>
                      <p className="mt-1 text-xs text-zinc-500">
                        Última violación: {formatDate(item.lastViolationAt)}
                      </p>
                    </div>

                    <div className="ml-4 flex items-center gap-3">
                      <div className="rounded-full bg-zinc-900 px-3 py-1 text-xs font-semibold text-white">
                        {item.violations} eventos
                      </div>
                      <span className="text-sm text-zinc-400">→</span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            <div className="mt-4 rounded-2xl border border-zinc-100 bg-zinc-50 p-4 text-sm text-zinc-600">
              <span className="font-medium text-zinc-900">Espacio recomendado:</span> aquí puedes
              agregar un mini gráfico de tendencia por horas, porcentaje de crecimiento y filtro por
              motivo de violación.
            </div>
          </SectionCard>

          <SectionCard
            title="Bans activos"
            subtitle="Bloqueos aplicados automáticamente o de forma manual."
            right={
              <div className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs text-zinc-600">
                Polling cada 8s
              </div>
            }
          >
            {loading ? (
              <div className="grid gap-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-20 animate-pulse rounded-2xl bg-zinc-100" />
                ))}
              </div>
            ) : activeBans.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-8 text-center text-sm text-zinc-500">
                No hay bans activos en este momento.
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-zinc-200">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left">
                    <thead className="bg-zinc-50">
                      <tr className="text-xs uppercase tracking-wide text-zinc-500">
                        <th className="px-4 py-3 font-medium">IP</th>
                        <th className="px-4 py-3 font-medium">Nivel</th>
                        <th className="px-4 py-3 font-medium">Hasta</th>
                        <th className="px-4 py-3 font-medium">Motivo</th>
                        <th className="px-4 py-3 font-medium">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeBans.map((item) => (
                        <tr key={item.ip} className="border-t border-zinc-100">
                          <td className="px-4 py-4">
                            <button
                              onClick={() => navigate(buildIpDetailPath(item.ip))}
                              className="text-sm font-semibold text-zinc-900 hover:text-[var(--brand)]"
                              style={{ ["--brand" as string]: BRAND }}
                            >
                              {item.ip}
                            </button>
                          </td>
                          <td className="px-4 py-4">
                            <span
                              className={cn(
                                "inline-flex rounded-full border px-3 py-1 text-xs font-semibold",
                                getBanBadgeStyles(item.banLevel, item.manualPermanentBan)
                              )}
                            >
                              {item.manualPermanentBan ? "MANUAL PERMANENTE" : item.banLevel}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-sm text-zinc-600">
                            {item.manualPermanentBan ? "Sin vencimiento" : formatDate(item.bannedUntil)}
                          </td>
                          <td className="px-4 py-4 text-sm text-zinc-600">
                            {item.notes?.trim() || "Sin detalle"}
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex flex-wrap gap-2">
                              <button
                                onClick={() => navigate(buildIpDetailPath(item.ip))}
                                className="rounded-xl border border-zinc-200 px-3 py-2 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50"
                              >
                                Ver detalle
                              </button>
                              <button
                                onClick={() => handleUnban(item.ip)}
                                disabled={mutating}
                                className="rounded-xl bg-zinc-900 px-3 py-2 text-xs font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
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
      </div>
    </div>
  );
}
