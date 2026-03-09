import { Activity, Clock3, RefreshCcw, Shield } from "lucide-react";

import { BRAND, formatDate } from "./security.utils";

export function HeaderPanel({
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
            Supervisa bloqueos, actividad sospechosa, rutas mas atacadas y senales de riesgo desde
            un solo panel.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3 text-xs text-zinc-500">
            <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5">
              <Activity className="h-3.5 w-3.5" />
              Polling automatico cada 8s
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5">
              <Clock3 className="h-3.5 w-3.5" />
              Ultima actualizacion:
              <span className="font-medium text-zinc-700">
                {lastUpdated ? formatDate(lastUpdated.toISOString()) : " Aun no disponible"}
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
            <option value={1}>Ultima 1 hora</option>
            <option value={6}>Ultimas 6 horas</option>
            <option value={12}>Ultimas 12 horas</option>
            <option value={24}>Ultimas 24 horas</option>
            <option value={48}>Ultimas 48 horas</option>
            <option value={168}>Ultimos 7 dias</option>
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
