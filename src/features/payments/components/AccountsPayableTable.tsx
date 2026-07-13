import { useMemo } from "react";
import type { ReactNode } from "react";
import { DataTable } from "@/shared/components/table/DataTable";
import type { DataTableColumn } from "@/shared/components/table/types";
import { getAccountPayableStatusView } from "../accountPayableView";
import type { AccountPayable } from "../types/payable.types";
import { AccountPayableActionsMenu } from "./AccountPayableActionsMenu";

type Props = {
  items: AccountPayable[];
  loading: boolean;
  page: number;
  limit: number;
  total: number;
  canManage: boolean;
  toolbarSearchContent: ReactNode;
  onPageChange: (page: number) => void;
  onRegisterPayment: (payable: AccountPayable) => void;
  onSchedulePayment: (payable: AccountPayable) => void;
};

const formatMoney = (amount: number, currency: string) =>
  `${currency} ${Number(amount ?? 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatDate = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("es-PE");
};

export function AccountsPayableTable({
  items,
  loading,
  page,
  limit,
  total,
  canManage,
  toolbarSearchContent,
  onPageChange,
  onRegisterPayment,
  onSchedulePayment,
}: Props) {
  const columns = useMemo<DataTableColumn<AccountPayable>[]>(() => [
    {
      id: "status",
      header: "Estado",
      cell: (row) => {
        const view = getAccountPayableStatusView(row.status);
        return <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${view.className}`}>{view.label}</span>;
      },
      hideable: false,
      cardTitle: true,
    },
    { id: "description", header: "Descripcion", cell: (row) => row.description ?? "-" },
    { id: "purchaseId", header: "Compra", cell: (row) => <span className="text-xs text-black/70">{row.purchaseId}</span>, copy: true },
    { id: "quotaId", header: "Cuota", cell: (row) => <span className="text-xs text-black/70">{row.quotaId ?? "-"}</span>, visible: false, copy: true },
    { id: "supplierId", header: "Proveedor", cell: (row) => <span className="text-xs text-black/70">{row.supplierId ?? "-"}</span>, visible: false, copy: true },
    { id: "amountTotal", header: "Total", cell: (row) => formatMoney(row.amountTotal, row.currency), sortAccessor: (row) => Number(row.amountTotal ?? 0) },
    { id: "amountPaid", header: "Pagado", cell: (row) => formatMoney(row.amountPaid, row.currency), sortAccessor: (row) => Number(row.amountPaid ?? 0) },
    {
      id: "amountPending",
      header: "Pendiente",
      cell: (row) => <span className="font-medium text-black/80">{formatMoney(row.amountPending, row.currency)}</span>,
      sortAccessor: (row) => Number(row.amountPending ?? 0),
    },
    { id: "dueDate", header: "Vence", cell: (row) => formatDate(row.dueDate), sortAccessor: (row) => row.dueDate ?? "" },
    {
      id: "actions",
      header: "Acciones",
      stopRowClick: true,
      hideable: false,
      sortable: false,
      cell: (row) => (
        <AccountPayableActionsMenu
          payable={row}
          canManage={canManage}
          onRegisterPayment={onRegisterPayment}
          onSchedulePayment={onSchedulePayment}
        />
      ),
      className: "text-center",
      headerClassName: "text-center [&>div]:justify-center",
      showInCards: false,
    },
  ], [canManage, onRegisterPayment, onSchedulePayment]);

  return (
    <DataTable
      tableId="accounts-payable-table"
      data={items}
      columns={columns}
      rowKey="accountPayableId"
      loading={loading}
      emptyMessage="No hay cuentas por pagar para los filtros actuales."
      selectableColumns
      hoverable={false}
      animated={false}
      toolbarSearchContent={toolbarSearchContent}
      pagination={{ page, limit, total }}
      onPageChange={onPageChange}
      tableClassName="text-[10px]"
    />
  );
}

