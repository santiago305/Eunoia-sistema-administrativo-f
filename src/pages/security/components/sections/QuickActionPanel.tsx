import { Ban, Download, Pause, Play, Search, ShieldCheck, Sparkles } from "lucide-react";
import { useState } from "react";

import { BRAND } from "../security.utils";
import { SectionCard } from "../SectionCard";

type RiskLookupResult = {
  ip: string;
  score: number;
  label: string;
  level?: string;
};

type ReasonOption = {
  value: string;
  label: string;
};

export function QuickActionPanel({
  onBlacklist,
  loading,
  pollingPaused,
  onTogglePolling,
  reasonOptions,
  selectedReason,
  onReasonChange,
  onExportAudit,
  exportLoading,
  onLookupIpRisk,
  ipRiskLoading,
  ipRiskResult,
}: {
  onBlacklist: (ip: string, notes?: string) => Promise<void>;
  loading: boolean;
  pollingPaused: boolean;
  onTogglePolling: () => void;
  reasonOptions: ReasonOption[];
  selectedReason: string;
  onReasonChange: (reason: string) => void;
  onExportAudit: () => Promise<void>;
  exportLoading: boolean;
  onLookupIpRisk: (ip: string) => Promise<void>;
  ipRiskLoading: boolean;
  ipRiskResult: RiskLookupResult | null;
}) {
  const [ip, setIp] = useState("");
  const [notes, setNotes] = useState("");
  const [riskIp, setRiskIp] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ip.trim()) return;
    await onBlacklist(ip.trim(), notes.trim() || undefined);
    setIp("");
    setNotes("");
  };

  const handleRiskLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!riskIp.trim()) return;
    await onLookupIpRisk(riskIp.trim());
  };

  return (
    <SectionCard
      title="Acciones rapidas"
      subtitle="Controles operativos para respuesta y auditoria."
      right={
        <div
          className="inline-flex items-center gap-2 rounded-full border border-[rgba(33,184,166,.16)] bg-[rgba(33,184,166,.06)] px-3 py-1.5 text-xs font-medium text-[var(--brand)]"
          style={{ ["--brand" as string]: BRAND }}
        >
          <Sparkles className="h-3.5 w-3.5" />
          Operacion activa
        </div>
      }
    >
      <div className="grid gap-5 2xl:grid-cols-2">
        <form
          className="grid gap-4 rounded-[24px] border border-zinc-200 bg-zinc-50/70 p-4 md:grid-cols-[1.1fr_1.4fr_auto]"
          onSubmit={handleSubmit}
        >
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
              Direccion IP
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
              placeholder="Ej: actividad anomala detectada"
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

        <div className="grid gap-4 rounded-[24px] border border-[rgba(33,184,166,.16)] bg-[linear-gradient(180deg,rgba(33,184,166,.08),rgba(255,255,255,1))] p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => void onExportAudit()}
              disabled={exportLoading}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Download className="h-4 w-4" />
              {exportLoading ? "Exportando..." : "Exportar auditoria"}
            </button>

            <button
              type="button"
              onClick={onTogglePolling}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-100"
            >
              {pollingPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
              {pollingPaused ? "Reanudar polling" : "Pausar polling"}
            </button>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
              Filtrar por motivo
            </label>
            <select
              value={selectedReason}
              onChange={(e) => onReasonChange(e.target.value)}
              className="h-11 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm text-zinc-800 outline-none transition focus:border-[var(--brand)] focus:ring-4 focus:ring-[rgba(33,184,166,.12)]"
              style={{ ["--brand" as string]: BRAND }}
            >
              <option value="">Todos los motivos</option>
              {reasonOptions.map((reason) => (
                <option key={reason.value} value={reason.value}>
                  {reason.label}
                </option>
              ))}
            </select>
          </div>

          <form className="grid gap-3 sm:grid-cols-[1fr_auto]" onSubmit={handleRiskLookup}>
            <input
              value={riskIp}
              onChange={(e) => setRiskIp(e.target.value)}
              placeholder="IP para score de riesgo"
              className="h-11 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm text-zinc-800 outline-none transition focus:border-[var(--brand)] focus:ring-4 focus:ring-[rgba(33,184,166,.12)]"
              style={{ ["--brand" as string]: BRAND }}
            />
            <button
              type="submit"
              disabled={ipRiskLoading}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <ShieldCheck className="h-4 w-4" />
              {ipRiskLoading ? "Consultando..." : "Consultar riesgo"}
            </button>
          </form>

          {ipRiskResult ? (
            <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-700">
              <p className="font-semibold text-zinc-900">IP: {ipRiskResult.ip}</p>
              <p>
                Score: <span className="font-semibold">{ipRiskResult.score}</span> ({ipRiskResult.label})
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </SectionCard>
  );
}
