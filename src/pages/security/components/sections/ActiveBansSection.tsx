import { useMemo } from "react";
import { DataTable } from "@/components/table/DataTable";
import type { DataTableColumn, DataTablePaginationMeta } from "@/components/table/types";
import type { SecurityActiveBanItem } from "../../types/security.api";
import { SectionCard } from "../SectionCard";
import { BRAND, buildIpDetailPath, cn, formatDate, getBanBadgeStyles } from "../security.utils";

export function ActiveBansSection({
  loading,
  activeBans,
  pagination,
  mutating,
  onNavigate,
  onUnban,
  onPageChange,
}: {
  loading: boolean;
  activeBans: SecurityActiveBanItem[];
  pagination: DataTablePaginationMeta;
  mutating: boolean;
  onNavigate: (path: string) => void;
  onUnban: (ip: string) => Promise<void>;
  onPageChange: (page: number) => void;
}) {
  const columns = useMemo<DataTableColumn<SecurityActiveBanItem>[]>(() => [
    {
      id: "ip",
      header: "IP",
      cell: (item) => (
        <button
          onClick={() => onNavigate(buildIpDetailPath(item.ip))}
          className="font-medium text-zinc-900 transition hover:text-[var(--brand)]"
          style={{ ["--brand" as string]: BRAND }}
        >
          {item.ip}
        </button>
      ),
      className: "font-mono text-xs",
    },
    {
      id: "level",
      header: "Nivel",
      cell: (item) => (
        <span
          className={cn(
            "inline-flex rounded-full border px-3 py-1.5 text-xs font-semibold",
            getBanBadgeStyles(item.banLevel, item.manualPermanentBan),
          )}
        >
          {item.manualPermanentBan
            ? "MANUAL PERMANENTE"
            : typeof item.banLevel === "number"
              ? `Nivel ${item.banLevel}`
              : item.banLevel}
        </span>
      ),
    },
    {
      id: "until",
      header: "Hasta",
      cell: (item) => (
        <span className="text-xs text-zinc-600">
          {item.manualPermanentBan ? "Sin vencimiento" : formatDate(item.bannedUntil)}
        </span>
      ),
    },
    {
      id: "reason",
      header: "Motivo",
      cell: (item) => (
        <div className="max-w-[280px] line-clamp-2 text-xs text-zinc-600">
          {item.notes?.trim() || item.lastReason?.trim() || "Sin detalle"}
        </div>
      ),
    },
    {
      id: "actions",
      header: "Acciones",
      headerClassName: "text-right",
      className: "w-[1%] whitespace-nowrap",
      cell: (item) => (
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
      ),
    },
  ], [mutating, onNavigate, onUnban]);

  return (
    <SectionCard
      title="Bans activos"
      subtitle="Bloqueos aplicados de forma automatica o manual."
    >
      <DataTable
        tableId="security-active-bans"
        data={activeBans}
        columns={columns}
        loading={loading}
        rowKey={(item) => item.id ?? item.ip}
        emptyMessage="No hay bans activos en este momento."
        pagination={pagination}
        onPageChange={onPageChange}
        tableClassName="min-w-[760px]"
        animated={false}
      />
    </SectionCard>
  );
}
