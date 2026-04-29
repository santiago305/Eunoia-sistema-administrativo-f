import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Activity,
  ArrowLeft,
  Ban,
  Clock3,
  Shield,
  ShieldAlert,
} from "lucide-react";
import {
  blacklistSecurityIp,
  getSecurityHistoryByIp,
  removeSecurityBlacklistIp,
} from "@/shared/services/securityService";
import { RoutesPaths } from "@/routes/config/routesPaths";

import type {
  SecurityHistoryByIpResponse,
  SecurityViolationItem,
} from "./types/security.api";
import { DashboardShell } from "./components/DashboardShell";
import { SectionCard } from "./components/SectionCard";
import { StatCard } from "./components/StatCard";
import { cn, formatDate, getBanBadgeStyles } from "./components/security.utils";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { FloatingTextarea } from "@/shared/components/components/FloatingTextarea";

const methodStyles: Record<string, string> = {
  GET: "border-sky-200 bg-sky-50 text-sky-700",
  POST: "border-emerald-200 bg-emerald-50 text-emerald-700",
  PUT: "border-amber-200 bg-amber-50 text-amber-700",
  PATCH: "border-violet-200 bg-violet-50 text-violet-700",
  DELETE: "border-red-200 bg-red-50 text-red-700",
};

const toMethodLabel = (method?: string | null) => {
  const value = method?.trim();
  return value ? value.toUpperCase() : "N/A";
};

export default function IpDetailPage() {
  const navigate = useNavigate();
  const params = useParams();
  const ip = decodeURIComponent(params.ip ?? "");

  const [data, setData] = useState<SecurityHistoryByIpResponse | null>(null);
  const [limit, setLimit] = useState(100);
  const [loading, setLoading] = useState(true);
  const [mutating, setMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState("");

  const fetchData = useCallback(async () => {
    if (!ip) return;

    try {
      setLoading(true);
      setError(null);
      const response = await getSecurityHistoryByIp(ip, { limit });
      setData(response);
    } catch (err) {
      console.error(err);
      setError("No se pudo cargar el historial de la IP.");
    } finally {
      setLoading(false);
    }
  }, [ip, limit]);

  useEffect(() => {
  void fetchData();
  }, [fetchData]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      void fetchData();
    }, 10000);

    return () => window.clearInterval(interval);
  }, [fetchData]);

  const summary = useMemo(() => {
    const violations = data?.violations ?? [];

    const byMethod = violations.reduce<Record<string, number>>((acc, item) => {
      const method = toMethodLabel(item.method);
      acc[method] = (acc[method] ?? 0) + 1;
      return acc;
    }, {});

    const lastViolation = violations[0]?.createdAt ?? null;
    const uniqueReasons = new Set(
      violations.map((item) => item.reason?.trim()).filter(Boolean),
    ).size;

    return {
      totalViolations: violations.length,
      lastViolation,
      byMethod,
      uniqueReasons,
    };
  }, [data]);

  const handleBlacklist = async () => {
    try {
      setMutating(true);
      await blacklistSecurityIp({ ip, notes: notes.trim() || undefined });
      await fetchData();
      setNotes("");
    } catch (err) {
      console.error(err);
      setError("No se pudo bloquear la IP.");
    } finally {
      setMutating(false);
    }
  };

  const handleUnban = async () => {
    try {
      setMutating(true);
      await removeSecurityBlacklistIp(ip);
      await fetchData();
    } catch (err) {
      console.error(err);
      setError("No se pudo quitar el bloqueo.");
    } finally {
      setMutating(false);
    }
  };

  const ban = data?.ban;
  const violations = data?.violations ?? [];
  const topMethods = Object.entries(summary.byMethod).sort((a, b) => b[1] - a[1]);

  return (
    <DashboardShell>
      <div className="space-y-4">
        <section className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
          <div className="border-b border-border bg-[radial-gradient(circle_at_top_left,_rgba(20,184,166,0.16),_transparent_42%),linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.98))] px-5 py-5 sm:px-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-3">
                <button
                  onClick={() => navigate(RoutesPaths.security)}
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:border-primary/30 hover:text-foreground"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Volver a seguridad
                </button>

                <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">
                  <Shield className="h-3.5 w-3.5" />
                  Detalle Forense
                </div>

                <div>
                  <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                    {ip || "IP no encontrada"}
                  </h1>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                    Estado operativo, historial de violaciones y contexto tecnico consolidado para esta IP.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-2 rounded-full border border-border bg-background px-3 py-2 text-xs text-muted-foreground">
                  <span>Eventos</span>
                  <select
                    value={limit}
                    onChange={(event) => setLimit(Number(event.target.value))}
                    className="bg-transparent font-medium text-foreground outline-none"
                  >
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={200}>200</option>
                    <option value={500}>500</option>
                  </select>
                </label>

                <SystemButton
                  size="sm"
                  variant="outline"
                  onClick={() => void fetchData()}
                  className="rounded-full"
                >
                  Refrescar
                </SystemButton>
              </div>
            </div>
          </div>
        </section>

        {error ? (
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <StatCard
            label="Estado"
            value={ban ? "Baneada" : "Sin ban"}
            subtitle={ban ? "La IP tiene un bloqueo activo" : "No hay bloqueo vigente"}
            icon={ban ? ShieldAlert : Shield}
            variant={ban ? "warning" : "default"}
          />
          <StatCard
            label="Nivel"
            value={ban?.manualPermanentBan ? "PERMANENTE" : ban?.banLevel || "NINGUNO"}
            subtitle={ban?.manualPermanentBan ? "Ban manual sin vencimiento" : "Clasificacion aplicada"}
            icon={Ban}
            variant={ban ? "destructive" : "default"}
          />
          <StatCard
            label="Violaciones"
            value={summary.totalViolations}
            subtitle="Eventos encontrados para esta IP"
            icon={Activity}
            variant="primary"
          />
          <StatCard
            label="Ultima actividad"
            value={summary.lastViolation ? formatDate(summary.lastViolation) : "Sin registros"}
            subtitle="Marca temporal del ultimo evento"
            icon={Clock3}
          />
        </div>

        <div className="grid gap-4 xl:grid-cols-[380px_minmax(0,1fr)]">
          <div className="space-y-4">
            <SectionCard
              title="Estado del ban"
              subtitle="Situacion actual y acciones de respuesta inmediata."
            >
              {loading ? (
                <div className="h-40 animate-pulse rounded-lg bg-muted" />
              ) : ban ? (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        "inline-flex rounded-full border px-3 py-1 text-xs font-semibold",
                        getBanBadgeStyles(String(ban.banLevel), ban.manualPermanentBan),
                      )}
                    >
                      {ban.manualPermanentBan ? "PERMANENTE" : ban.banLevel}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {ban.manualPermanentBan
                        ? "Sin vencimiento"
                        : `Vence: ${formatDate(ban.bannedUntil)}`}
                    </span>
                  </div>

                  <div className="rounded-lg border border-border bg-muted/40 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Notas
                    </p>
                    <p className="mt-2 text-sm text-foreground">
                      {ban.notes?.trim() || "Sin notas registradas para este ban."}
                    </p>
                  </div>

                  <SystemButton
                    variant="danger"
                    onClick={() => void handleUnban()}
                    loading={mutating}
                    className="w-full"
                  >
                    Quitar ban
                  </SystemButton>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-lg border border-dashed border-border bg-muted/30 p-3 text-sm text-muted-foreground">
                    Esta IP no tiene un ban activo actualmente.
                  </div>

                  <FloatingTextarea
                    label="Notas del blacklist"
                    name="security-ip-blacklist-notes"
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    rows={4}
                  />

                  <SystemButton
                    variant="danger"
                    onClick={() => void handleBlacklist()}
                    loading={mutating}
                    disabled={!ip}
                    className="w-full"
                  >
                    Aplicar blacklist manual
                  </SystemButton>
                </div>
              )}
            </SectionCard>

            <SectionCard
              title="Resumen tecnico"
              subtitle="Distribución de metodos y señales basicas observadas."
            >
              {loading ? (
                <div className="space-y-3">
                  <div className="h-16 animate-pulse rounded-lg bg-muted" />
                  <div className="h-16 animate-pulse rounded-lg bg-muted" />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg border border-border bg-muted/40 p-3">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                        Rutas distintas
                      </p>
                      <p className="mt-2 text-2xl font-semibold text-foreground">
                        {new Set(violations.map((item) => item.path?.trim()).filter(Boolean)).size}
                      </p>
                    </div>
                    <div className="rounded-lg border border-border bg-muted/40 p-3">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                        Razones distintas
                      </p>
                      <p className="mt-2 text-2xl font-semibold text-foreground">
                        {summary.uniqueReasons}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {topMethods.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-border bg-muted/30 p-3 text-sm text-muted-foreground">
                        Sin metodos registrados aun.
                      </div>
                    ) : (
                      topMethods.map(([method, count]) => (
                        <div
                          key={method}
                          className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2"
                        >
                          <span className="text-sm font-medium text-foreground">{method}</span>
                          <span className="font-mono text-sm text-muted-foreground">{count}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </SectionCard>
          </div>

          <SectionCard
            title="Historial de violaciones"
            subtitle="Eventos mas recientes asociados a esta direccion IP."
          >
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className="h-24 animate-pulse rounded-lg bg-muted" />
                ))}
              </div>
            ) : violations.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
                No hay violaciones registradas para esta IP.
              </div>
            ) : (
              <div className="space-y-3">
                {violations.map((item: SecurityViolationItem, index: number) => (
                  <article
                    key={`${item.createdAt}-${index}`}
                    className="rounded-lg border border-border bg-background p-4 transition hover:border-primary/20 hover:shadow-sm"
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={cn(
                              "inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold",
                              methodStyles[toMethodLabel(item.method)] || "border-zinc-200 bg-zinc-50 text-zinc-700",
                            )}
                          >
                            {toMethodLabel(item.method)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(item.createdAt)}
                          </span>
                        </div>

                        <h3 className="mt-3 text-sm font-semibold text-foreground">
                          {item.reason?.trim() || "Sin motivo registrado"}
                        </h3>

                        <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
                          <div className="rounded-lg border border-border bg-muted/35 px-3 py-2 text-sm text-foreground">
                            <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                              Ruta
                            </span>
                            <p className="mt-1 break-all font-mono text-xs text-foreground">
                              {item.path?.trim() || "Sin ruta"}
                            </p>
                          </div>

                          <div className="rounded-lg border border-border bg-muted/35 px-3 py-2 text-sm text-foreground">
                            <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                              User-Agent
                            </span>
                            <p className="mt-1 line-clamp-3 text-xs leading-5 text-muted-foreground">
                              {item.userAgent?.trim() || "No disponible"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    </DashboardShell>
  );
}
