import { Search, Sparkles, Ban } from "lucide-react";
import { useState } from "react";

import { BRAND } from "../security.utils";
import { SectionCard } from "../SectionCard";

export function QuickActionPanel({
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
      title="Acciones rapidas"
      subtitle="Bloquea una IP manualmente sin entrar al detalle."
      right={
        <div
          className="inline-flex items-center gap-2 rounded-full border border-[rgba(33,184,166,.16)] bg-[rgba(33,184,166,.06)] px-3 py-1.5 text-xs font-medium text-[var(--brand)]"
          style={{ ["--brand" as string]: BRAND }}
        >
          <Sparkles className="h-3.5 w-3.5" />
          Accion inmediata
        </div>
      }
    >
      <div className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
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

        <div className="rounded-[24px] border border-[rgba(33,184,166,.16)] bg-[linear-gradient(180deg,rgba(33,184,166,.08),rgba(255,255,255,1))] p-5">
          <p className="text-sm font-semibold text-zinc-950">Este bloque puede crecer con:</p>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-zinc-600">
            <li>- exportacion de auditoria</li>
            <li>- pausa de polling</li>
            <li>- filtro por motivo</li>
            <li>- score de riesgo por IP</li>
          </ul>
        </div>
      </div>
    </SectionCard>
  );
}
