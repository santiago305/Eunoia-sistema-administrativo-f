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

const date = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("es-PE");
};

export function IncomeTable({ rows, loading }: Props) {
  const columns = useMemo<DataTableColumn<Income>[]>(
    () => [
      {
        id: "saleOrderId",
        header: "Pedido",
        accessorKey: "saleOrderId",
        hideable: false,
        cell: (row) => row.saleOrderId.slice(0, 8),
      },
      { id: "clientName", header: "Cliente", accessorKey: "clientName", hideable: false },
      {
        id: "amount",
        header: "Monto",
        accessorKey: "amount",
        hideable: false,
        className: "text-right font-medium tabular-nums",
        headerClassName: "text-right [&>div]:justify-end",
        cell: (row) => money(row.amount),
      },
      { id: "method", header: "Metodo", accessorKey: "method" },
      {
        id: "account",
        header: "Cuenta",
        cell: (row) => row.companyPaymentAccountLabel ?? "Sin cuenta",
      },
      {
        id: "operationNumber",
        header: "Operacion",
        cell: (row) => row.operationNumber ?? "-",
      },
      {
        id: "date",
        header: "Fecha",
        accessorKey: "date",
        cell: (row) => date(row.date),
      },
      {
        id: "evidence",
        header: "Evidencia",
        cell: (row) =>
          row.evidenceUrl ? (
            <a className="font-medium text-teal-700 hover:underline" href={row.evidenceUrl} target="_blank" rel="noreferrer">
              Ver
            </a>
          ) : (
            "Sin evidencia"
          ),
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
      maxHeight="560px"
    />
  );
}
