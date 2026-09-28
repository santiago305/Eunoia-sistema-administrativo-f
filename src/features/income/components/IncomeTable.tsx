import { useMemo } from "react";
import { DataTable } from "@/shared/components/table/DataTable";
import type { DataTableColumn } from "@/shared/components/table/types";
import type { Income } from "../types/income.types";

type Props = {
  rows: Income[];
  loading?: boolean;
};

const money = (value: number) =>
  new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(value || 0);

const parseDate = (value: string) => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const paymentDate = (value: string) => {
  const parsed = parseDate(value);
  if (!parsed) return value;
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(parsed);
};

const paymentMonth = (value: string) => {
  const parsed = parseDate(value);
  if (!parsed) return "-";
  return new Intl.DateTimeFormat("es-PE", {
    month: "short",
    timeZone: "UTC",
  })
    .format(parsed)
    .replace(".", "")
    .slice(0, 3)
    .toLocaleLowerCase("es-PE");
};

const detailTone = (detail: string | null) => {
  const normalized = detail?.trim().toLocaleLowerCase("es-PE") ?? "";
  if (normalized.includes("anticipo")) {
    return "border-sky-200 bg-sky-50 text-sky-700";
  }
  if (normalized.includes("saldo")) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  return "border-border bg-muted/60 text-muted-foreground";
};

export function IncomeTable({ rows, loading }: Props) {
  const columns = useMemo<DataTableColumn<Income>[]>(
    () => [
      {
        id: "month",
        header: "Mes",
        hideable: false,
        width: "72px",
        className: "font-semibold uppercase text-muted-foreground",
        cell: (row) => paymentMonth(row.date),
        sortAccessor: (row) => new Date(row.date),
      },
      {
        id: "date",
        header: "Fecha de pago",
        accessorKey: "date",
        hideable: false,
        width: "132px",
        cell: (row) => paymentDate(row.date),
        sortAccessor: (row) => new Date(row.date),
      },
      {
        id: "operationNumber",
        header: "N.º de operación",
        hideable: false,
        copy: true,
        cell: (row) => row.operationNumber ?? "-",
      },
      {
        id: "method",
        header: "Método de pago",
        accessorKey: "method",
        hideable: false,
      },
      {
        id: "amount",
        header: "Monto",
        accessorKey: "amount",
        hideable: false,
        className: "text-right font-semibold tabular-nums",
        headerClassName: "text-right [&>div]:justify-end",
        cell: (row) => money(row.amount),
      },
      {
        id: "saleOrderNumber",
        header: "N.º de pedido",
        accessorKey: "saleOrderNumber",
        hideable: false,
        copy: true,
        className: "font-semibold tabular-nums",
        cardTitle: true,
      },
      {
        id: "detail",
        header: "Detalle",
        accessorKey: "detail",
        hideable: false,
        cell: (row) => (
          <span
            className={`inline-flex max-w-full rounded-full border px-2 py-0.5 text-[11px] font-semibold ${detailTone(row.detail)}`}
            title={row.detail ?? "Sin detalle"}
          >
            <span className="truncate">{row.detail?.trim() || "Sin detalle"}</span>
          </span>
        ),
      },
      {
        id: "account",
        header: "Cuenta destino",
        hideable: false,
        cell: (row) => row.companyPaymentAccountLabel ?? "Sin cuenta asignada",
      },
    ],
    [],
  );

  return (
    <DataTable
      tableId="income-table"
      data={rows}
      columns={columns}
      rowKey="incomeId"
      loading={loading}
      emptyMessage="Sin ingresos para mostrar."
      hoverable
      animated={false}
      responsiveCards
      initialSort={{ columnId: "date", direction: "desc" }}
      maxHeight="none"
    />
  );
}
