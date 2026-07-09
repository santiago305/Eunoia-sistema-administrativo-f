import { useMemo } from "react";
import { DataTable } from "@/shared/components/table/DataTable";
import type { DataTableColumn } from "@/shared/components/table/types";
import type { PurchaseDashboardPaymentRow } from "@/features/purchases/types/purchase-dashboard.types";
import { formatPurchaseDashboardPaymentStatus } from "@/features/purchases/utils/purchaseDashboardLabels";
import { money } from "@/shared/utils/functionPurchases";

type Props = {
  title: string;
  rows: PurchaseDashboardPaymentRow[];
  limit?: number;
};

type DashboardPaymentRow = Record<string, unknown> & {
  id: string;
  supplier: string;
  dueDate: string;
  status: string;
  pending: string;
};

export function UpcomingPaymentsTable({ title, rows, limit }: Props) {
  const tableId = `purchase-dashboard-payments-${toTableIdSuffix(title)}`;
  const tableRows = useMemo<DashboardPaymentRow[]>(
    () =>
      rows.map((row) => ({
        id: row.accountPayableId,
        supplier: row.supplierName ?? "Proveedor sin nombre",
        dueDate: row.dueDate ?? "Sin fecha",
        status: formatPurchaseDashboardPaymentStatus(row.status),
        pending: money(row.amountPending, row.currency === "USD" ? "USD" : "PEN"),
      })),
    [rows],
  );

  const columns = useMemo<DataTableColumn<DashboardPaymentRow>[]>(
    () => [
      { id: "supplier", header: "Proveedor", accessorKey: "supplier", hideable: false },
      { id: "dueDate", header: "Vence", accessorKey: "dueDate", hideable: false },
      { id: "status", header: "Estado", accessorKey: "status", hideable: false },
      {
        id: "pending",
        header: "Pendiente",
        accessorKey: "pending",
        hideable: false,
        className: "text-right font-medium tabular-nums",
        headerClassName: "text-right [&>div]:justify-end",
      },
    ],
    [],
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
          data={tableRows}
          columns={columns}
          rowKey="id"
          emptyMessage="Sin cuentas para mostrar."
          hoverable={false}
          animated={false}
          responsiveCards={false}
          maxHeight="360px"
        />
      </div>
    </section>
  );
}

function toTableIdSuffix(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
