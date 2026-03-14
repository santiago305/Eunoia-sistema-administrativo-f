import {
  Ban,
  Download,
  Pause,
  Play,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

import { BRAND } from "../security.utils";
import { SectionCard } from "../SectionCard";
import { CustomSelect } from "@/components/CustomSelect";


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

  const getRiskColor = (score: number) => {
    if (score > 80) return "bg-red-100 text-red-600";
    if (score > 50) return "bg-yellow-100 text-yellow-700";
    return "bg-green-100 text-green-600";
  };

  return (
    <SectionCard
      title="Acciones rápidas"
      subtitle="Controles operativos para respuesta y auditoría."
      right={
        <div
          className="inline-flex items-center gap-2 rounded-full border border-[rgba(33,184,166,.18)] bg-[rgba(33,184,166,.08)] px-3 py-1.5 text-xs font-semibold text-[var(--brand)]"
          style={{ ["--brand" as string]: BRAND }}
        >
          <Sparkles className="h-3.5 w-3.5" />
          Operación activa
        </div>
      }
    >
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="grid gap-6 2xl:grid-cols-2"
      >
        {/* FORM BLACKLIST */}
        <form
          onSubmit={handleSubmit}
          className="grid gap-4 rounded-[26px] border border-zinc-200 bg-zinc-50/60 p-5 md:grid-cols-[1.1fr_1.4fr_auto]"
        >
          {/* IP */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
              Dirección IP
            </label>

            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />

              <input
                value={ip}
                onChange={(e) => setIp(e.target.value)}
                placeholder="Ej: 203.0.113.55"
                className="h-12 w-full rounded-2xl border border-zinc-200 bg-white pl-11 pr-4 text-sm text-zinc-800 outline-none transition focus:border-[var(--brand)] focus:ring-4 focus:ring-[rgba(33,184,166,.12)]"
                style={{ ["--brand" as string]: BRAND }}
              />
            </div>
          </div>

          {/* MOTIVO */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
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

          {/* BOTON */}
          <div className="flex items-end">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
              type="submit"
              disabled={loading}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 md:w-auto"
            >
              <Ban className="h-4 w-4" />
              {loading ? "Bloqueando..." : "Blacklist manual"}
            </motion.button>
          </div>
        </form>

        {/* CONTROLES */}
        <div className="grid gap-4 rounded-[26px] border border-[rgba(33,184,166,.16)] bg-[linear-gradient(180deg,rgba(33,184,166,.08),rgba(255,255,255,1))] p-5">
          {/* BOTONES */}
          <div className="grid gap-3 sm:grid-cols-2">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => void onExportAudit()}
              disabled={exportLoading}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-800 hover:bg-zinc-100"
            >
              <Download className="h-4 w-4" />
              {exportLoading ? "Exportando..." : "Exportar auditoría"}
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
              onClick={onTogglePolling}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-800 hover:bg-zinc-100"
            >
              {pollingPaused ? (
                <Play className="h-4 w-4" />
              ) : (
                <Pause className="h-4 w-4" />
              )}

              {pollingPaused ? "Reanudar polling" : "Pausar polling"}
            </motion.button>
          </div>

          {/* FILTRO */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
              Filtrar por motivo
            </label>

            <CustomSelect
              options={reasonOptions}
              value={selectedReason}
              onChange={onReasonChange}
              placeholder="Todos los motivos"
            />
          </div>

          {/* RISK LOOKUP */}
          <form
            onSubmit={handleRiskLookup}
            className="grid gap-3 sm:grid-cols-[1fr_auto]"
          >
            <input
              value={riskIp}
              onChange={(e) => setRiskIp(e.target.value)}
              placeholder="IP para score de riesgo"
              className="h-11 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm text-zinc-800 outline-none transition focus:border-[var(--brand)] focus:ring-4 focus:ring-[rgba(33,184,166,.12)]"
              style={{ ["--brand" as string]: BRAND }}
            />

            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
              type="submit"
              disabled={ipRiskLoading}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-4 text-sm font-semibold text-white hover:opacity-90"
            >
              <ShieldCheck className="h-4 w-4" />
              {ipRiskLoading ? "Consultando..." : "Consultar riesgo"}
            </motion.button>
          </form>

          {/* RESULTADO */}
          <AnimatePresence>
            {ipRiskResult && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-white px-4 py-3 shadow-sm"
              >
                {/* IP */}
                <div className="flex flex-col">
                  <span className="text-xs uppercase tracking-wide text-zinc-500">
                    IP analizada
                  </span>
                  <span className="font-semibold text-zinc-900">
                    {ipRiskResult.ip}
                  </span>
                </div>

                {/* SCORE */}
                <div className="flex items-center gap-3">
                  <span className="text-xs uppercase tracking-wide text-zinc-500">
                    Riesgo
                  </span>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${getRiskColor(
                      ipRiskResult.score
                    )}`}
                  >
                    {ipRiskResult.label} · {ipRiskResult.score}
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
        </div>
      </motion.div>
    </SectionCard>
  );
}