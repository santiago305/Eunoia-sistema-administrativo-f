import type { SecurityActiveBanItem } from "../../types/security.api";
import { SectionCard } from "../SectionCard";
import { BRAND, buildIpDetailPath, cn, formatDate, getBanBadgeStyles } from "../security.utils";

export function ActiveBansSection({
  loading,
  activeBans,
  mutating,
  onNavigate,
  onUnban,
}: {
  loading: boolean;
  activeBans: SecurityActiveBanItem[];
  mutating: boolean;
  onNavigate: (path: string) => void;
  onUnban: (ip: string) => Promise<void>;
}) {
  return (
    <SectionCard
      title="Bans activos"
      subtitle="Bloqueos aplicados de forma automatica o manual."
    >
      {loading ? (
        <div className="grid gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-[88px] animate-pulse rounded-[22px] bg-zinc-100" />
          ))}
        </div>
      ) : activeBans.length === 0 ? (
        <div className="rounded-[24px] border border-dashed border-zinc-200 bg-zinc-50 p-10 text-center text-sm text-zinc-500">
          No hay bans activos en este momento.
        </div>
      ) : (
        <div className="overflow-hidden rounded-[24px] border border-zinc-200">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead className="bg-zinc-50">
                <tr className="text-xs uppercase tracking-[0.12em] text-zinc-500">
                  <th className="px-5 py-4 font-semibold">IP</th>
                  <th className="px-5 py-4 font-semibold">Nivel</th>
                  <th className="px-5 py-4 font-semibold">Hasta</th>
                  <th className="px-5 py-4 font-semibold">Motivo</th>
                  <th className="px-5 py-4 font-semibold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {activeBans.map((item) => (
                  <tr key={item.id ?? item.ip} className="border-t border-zinc-100 transition hover:bg-zinc-50/60">
                    <td className="px-5 py-4">
                      <button
                        onClick={() => onNavigate(buildIpDetailPath(item.ip))}
                        className="text-sm font-semibold text-zinc-900 transition hover:text-[var(--brand)]"
                        style={{ ["--brand" as string]: BRAND }}
                      >
                        {item.ip}
                      </button>
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={cn(
                          "inline-flex rounded-full border px-3 py-1.5 text-xs font-semibold",
                          getBanBadgeStyles(item.banLevel, item.manualPermanentBan)
                        )}
                      >
                        {item.manualPermanentBan
                          ? "MANUAL PERMANENTE"
                          : typeof item.banLevel === "number"
                            ? `Nivel ${item.banLevel}`
                            : item.banLevel}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-sm text-zinc-600">
                      {item.manualPermanentBan ? "Sin vencimiento" : formatDate(item.bannedUntil)}
                    </td>

                    <td className="max-w-[280px] px-5 py-4 text-sm text-zinc-600">
                      <div className="line-clamp-2">{item.notes?.trim() || item.lastReason?.trim() || "Sin detalle"}</div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => onNavigate(buildIpDetailPath(item.ip))}
                          className="rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50"
                        >
                          Ver detalle
                        </button>
                        <button
                          onClick={() => void onUnban(item.ip)}
                          disabled={mutating}
                          className="rounded-xl bg-zinc-950 px-3.5 py-2 text-xs font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
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
  );
}
