import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";


import {
  getSecurityHistoryByIp,
  blacklistSecurityIp,
  removeSecurityBlacklistIp,
} from "@/services/securityService";

import type {
  SecurityHistoryByIpResponse,
  SecurityViolationItem,
} from "./types/security.api";
import { RoutesPaths } from "@/Router/config/routesPaths";

const BRAND = "hsl(var(--primary))";

const cn = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

const formatDate = (value?: string | null) => {
  if (!value) return "Sin fecha";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const methodStyles: Record<string, string> = {
  GET: "border-sky-200 bg-sky-50 text-sky-700",
  POST: "border-emerald-200 bg-emerald-50 text-emerald-700",
  PUT: "border-amber-200 bg-amber-50 text-amber-700",
  PATCH: "border-violet-200 bg-violet-50 text-violet-700",
  DELETE: "border-red-200 bg-red-50 text-red-700",
};

function DetailCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-[0_10px_30px_rgba(0,0,0,.04)]">
      <h2 className="text-lg font-semibold text-zinc-900">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function MiniStat({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-2 text-xl font-semibold text-zinc-900">{value}</p>
    </div>
  );
}

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

  const fetchData = async () => {
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
  };

  useEffect(() => {
    fetchData();
  }, [ip, limit]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      fetchData();
    }, 10000);

    return () => window.clearInterval(interval);
  }, [ip, limit]);

  const summary = useMemo(() => {
    const violations = data?.violations ?? [];

    const byMethod = violations.reduce<Record<string, number>>((acc, item) => {
      acc[item.method] = (acc[item.method] ?? 0) + 1;
      return acc;
    }, {});

    const lastViolation = violations[0]?.createdAt ?? null;

    return {
      totalViolations: violations.length,
      lastViolation,
      byMethod,
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

  return (
    <div className="min-h-full bg-[#f8faf9]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 md:p-6">
        <header className="rounded-[28px] border border-zinc-200 bg-white p-6 shadow-[0_10px_30px_rgba(0,0,0,.04)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <button
                onClick={() => navigate(RoutesPaths.security)}
                className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100"
              >
                ← Volver al dashboard
              </button>

              <div
                className="mt-4 inline-flex rounded-full border px-3 py-1 text-xs font-semibold"
                style={{
                  borderColor: "rgba(33,184,166,.20)",
                  backgroundColor: "rgba(33,184,166,.07)",
                  color: BRAND,
                }}
              >
                Forense por IP
              </div>

              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-zinc-950 md:text-4xl">
                {ip || "IP no encontrada"}
              </h1>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-600">
                Revisa estado del ban, historial de violaciones y comportamiento técnico de esta IP.
                Porque claramente alguien decidió ponerse creativo con tu sistema.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <select
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                className="h-11 rounded-2xl border border-zinc-200 bg-white px-4 text-sm text-zinc-700 outline-none focus:border-[rgba(33,184,166,.6)]"
              >
                <option value={25}>25 eventos</option>
                <option value={50}>50 eventos</option>
                <option value={100}>100 eventos</option>
                <option value={200}>200 eventos</option>
                <option value={500}>500 eventos</option>
              </select>

              <button
                onClick={fetchData}
                className="h-11 rounded-2xl bg-zinc-900 px-5 text-sm font-semibold text-white transition hover:opacity-90"
              >
                Refrescar
              </button>
            </div>
          </div>
        </header>

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MiniStat label="Estado" value={ban ? "Baneada" : "Sin ban activo"} />
          <MiniStat label="Nivel" value={ban?.manualPermanentBan ? "PERMANENTE" : ban?.banLevel || "Ninguno"} />
          <MiniStat label="Violaciones" value={summary.totalViolations} />
          <MiniStat label="Última actividad" value={summary.lastViolation ? formatDate(summary.lastViolation) : "Sin registros"} />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_1.4fr]">
          <div className="flex flex-col gap-6">
            <DetailCard title="Estado actual del ban">
              {loading ? (
                <div className="h-40 animate-pulse rounded-2xl bg-zinc-100" />
              ) : ban ? (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <span
                      className={cn(
                        "inline-flex rounded-full border px-3 py-1 text-xs font-semibold",
                        ban.manualPermanentBan || ban.banLevel === "PERMANENT"
                          ? "border-red-200 bg-red-50 text-red-700"
                          : "border-amber-200 bg-amber-50 text-amber-700"
                      )}
                    >
                      {ban.manualPermanentBan ? "PERMANENTE" : ban.banLevel}
                    </span>

                    <span className="text-sm text-zinc-500">
                      {ban.manualPermanentBan
                        ? "Sin vencimiento"
                        : `Vence: ${formatDate(ban.bannedUntil)}`}
                    </span>
                  </div>

                  <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700">
                    <p className="font-medium text-zinc-900">Notas</p>
                    <p className="mt-1">{ban.notes?.trim() || "Sin notas registradas"}</p>
                  </div>

                  <button
                    onClick={handleUnban}
                    disabled={mutating}
                    className="rounded-2xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {mutating ? "Procesando..." : "Quitar ban"}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-500">
                    Esta IP no tiene un ban activo actualmente.
                  </div>

                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={4}
                    placeholder="Motivo opcional del bloqueo manual"
                    className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-800 outline-none transition focus:border-[rgba(33,184,166,.6)] focus:ring-4 focus:ring-[rgba(33,184,166,.12)]"
                  />

                  <button
                    onClick={handleBlacklist}
                    disabled={mutating}
                    className="rounded-2xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {mutating ? "Procesando..." : "Aplicar blacklist manual"}
                  </button>
                </div>
              )}
            </DetailCard>

            <DetailCard title="Resumen técnico">
              {loading ? (
                <div className="h-44 animate-pulse rounded-2xl bg-zinc-100" />
              ) : (
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    {Object.entries(summary.byMethod).length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-500">
                        Sin métodos registrados aún.
                      </div>
                    ) : (
                      Object.entries(summary.byMethod).map(([method, count]) => (
                        <div
                          key={method}
                          className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4"
                        >
                          <p className="text-xs uppercase tracking-wide text-zinc-500">{method}</p>
                          <p className="mt-2 text-2xl font-semibold text-zinc-900">{count}</p>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="rounded-2xl border border-[rgba(33,184,166,.18)] bg-[rgba(33,184,166,.06)] p-4 text-sm text-zinc-700">
                    <p className="font-medium text-zinc-900">Espacio recomendado</p>
                    <p className="mt-1">
                      Aquí puedes añadir geolocalización aproximada por IP, score de riesgo, ASN,
                      reputación externa y correlación con sesiones o usuarios si luego lo integras.
                    </p>
                  </div>
                </div>
              )}
            </DetailCard>
          </div>

          <DetailCard title="Timeline de violaciones">
            {loading ? (
              <div className="grid gap-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="h-24 animate-pulse rounded-2xl bg-zinc-100" />
                ))}
              </div>
            ) : violations.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-8 text-center text-sm text-zinc-500">
                No hay violaciones registradas para esta IP.
              </div>
            ) : (
              <div className="space-y-4">
                {violations.map((item: SecurityViolationItem, index: number) => (
                  <div
                    key={`${item.createdAt}-${index}`}
                    className="rounded-2xl border border-zinc-200 bg-white p-4"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={cn(
                              "inline-flex rounded-full border px-3 py-1 text-xs font-semibold",
                              methodStyles[item.method] || "border-zinc-200 bg-zinc-50 text-zinc-700"
                            )}
                          >
                            {item.method}
                          </span>

                          <span className="text-xs text-zinc-500">
                            {formatDate(item.createdAt)}
                          </span>
                        </div>

                        <p className="mt-3 text-sm font-semibold text-zinc-900">
                          {item.reason || "Sin reason"}
                        </p>

                        <p className="mt-2 break-all text-sm text-zinc-600">
                          Ruta: <span className="font-medium text-zinc-800">{item.path || "Sin ruta"}</span>
                        </p>

                        <p className="mt-2 text-sm text-zinc-600">
                          User-Agent:
                        </p>
                        <div className="mt-1 rounded-xl bg-zinc-50 p-3 text-xs leading-5 text-zinc-500">
                          {item.userAgent?.trim() || "No disponible"}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </DetailCard>
        </div>
      </div>
    </div>
  );
}
