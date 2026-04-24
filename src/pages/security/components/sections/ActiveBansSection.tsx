import { memo, useMemo } from "react";
import { DataTable } from "@/components/table/DataTable";
import type { DataTableColumn, DataTablePaginationMeta } from "@/components/table/types";
import type { SecurityActiveBanItem } from "../../types/security.api";
import { SectionCard } from "../SectionCard";
import { buildIpDetailPath, cn, formatDate, getBanBadgeStyles } from "../security.utils";

export const ActiveBansSection = memo(function ActiveBansSection({
  loading,
  activeBans,
  pagination,
  onNavigate,
  onPageChange,
}: {
  loading: boolean;
  activeBans: SecurityActiveBanItem[];
  pagination: DataTablePaginationMeta;
  onNavigate: (path: string) => void;
  onPageChange: (page: number) => void;
}) {
  const columns = useMemo<DataTableColumn<SecurityActiveBanItem>[]>(() => [
    {
      id: "ip",
      header: "IP",
      cell: (item) => <span className="font-medium text-zinc-900">{item.ip}</span>,
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
            ? "PERMANENTE"
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
  ], []);

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
        onRowClick={(item) => onNavigate(buildIpDetailPath(item.ip))}
        tableClassName="min-w-[760px]"
        animated={false}
      />
    </SectionCard>
  );
});
