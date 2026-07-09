import { useMemo } from "react";
import { DataTable } from "@/shared/components/table/DataTable";
import type { DataTableColumn } from "@/shared/components/table/types";

export type PurchaseDashboardRankingRow = Record<string, unknown> & {
  id: string;
  item: string;
  type: string;
  total: string;
};

type Props = {
  title: string;
  tableId: string;
  rows: PurchaseDashboardRankingRow[];
  headers?: [string, string, string];
  limit?: number;
};

export function PurchaseDashboardRankingTable({
  title,
  tableId,
  rows,
  headers = ["Item", "Tipo", "Total"],
  limit,
}: Props) {
  const columns = useMemo<DataTableColumn<PurchaseDashboardRankingRow>[]>(
    () => [
      {
        id: "item",
        header: headers[0],
        accessorKey: "item",
        hideable: false,
      },
      {
        id: "type",
        header: headers[1],
        accessorKey: "type",
        hideable: false,
      },
      {
        id: "total",
        header: headers[2],
        accessorKey: "total",
        hideable: false,
        className: "text-right font-medium",
        headerClassName: "text-right [&>div]:justify-end",
      },
    ],
    [headers],
  );

  return (
    <section className="rounded-md border border-black/10 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-black">{title}</h2>
        {limit ? <span className="text-xs text-black/50">Mostrando top {limit}</span> : null}
      </div>
      <div className="mt-3">
        <DataTable
          tableId={tableId}
          data={rows}
          columns={columns}
          rowKey="id"
          emptyMessage="Sin datos para mostrar."
          hoverable={false}
          animated={false}
          responsiveCards={false}
          maxHeight="360px"
        />
      </div>
    </section>
  );
}
