import { useMemo } from "react";
import { DataTable } from "@/components/table/DataTable";
import type { DataTableColumn } from "@/components/table/types";
import type { SecurityTopIpItem } from "../../types/security.api";
import { SectionCard } from "../SectionCard";

function formatLastViolation(item: SecurityTopIpItem) {
  if (item.lastViolationAtLocal?.trim()) return item.lastViolationAtLocal;
  if (!item.lastViolationAt) return "-";

  const date = new Date(item.lastViolationAt);
  if (Number.isNaN(date.getTime())) return item.lastViolationAt;

  return date.toLocaleString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export function TopIpsSection({
  loading,
  topIps,
}: {
  loading: boolean;
  topIps: SecurityTopIpItem[];
}) {
  const columns = useMemo<DataTableColumn<SecurityTopIpItem>[]>(() => {
    return [
      {
        id: "ip",
        header: "IP",
        cell: (item) => <span className="font-mono text-xs text-zinc-900">{item.ip}</span>,
        hideable: false,
      },
      {
        id: "violations",
        header: "Violaciones",
        cell: (item) => (
          <span className="inline-flex rounded-lg bg-slate-50 px-2 py-1 text-[10px] font-semibold text-slate-700">
            {item.violations}
          </span>
        ),
        hideable: false,
      },
      {
        id: "lastViolationAt",
        header: "Ultima violacion",
        cell: (item) => (
          <span className="text-xs text-zinc-600">{formatLastViolation(item)}</span>
        ),
      },
    ];
  }, []);

  return (
    <SectionCard
      title="Top IPs"
      subtitle="IPs con mayor numero de violaciones en el rango seleccionado."
    >
      <DataTable
        tableId="security-top-ips"
        data={topIps}
        columns={columns}
        loading={loading}
        rowKey={(item) => item.ip}
        emptyMessage="No hay IPs con actividad registrada para este rango."
        tableClassName="min-w-[560px]"
        animated={false}
        hoverable={false}
        responsiveCards={false}
      />
    </SectionCard>
  );
}
