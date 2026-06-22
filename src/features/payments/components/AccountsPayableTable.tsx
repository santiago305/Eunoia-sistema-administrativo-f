import { useMemo } from "react";
import { CreditCard } from "lucide-react";
import { DataTable } from "@/shared/components/table/DataTable";
import type { DataTableColumn } from "@/shared/components/table/types";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { canRegisterAccountPayablePayment, getAccountPayableStatusView } from "../accountPayableView";
import type { AccountPayable } from "../types/payable.types";

type Props = {
  items: AccountPayable[];
  loading: boolean;
  page: number;
  limit: number;
  total: number;
  canManage: boolean;
  onPageChange: (page: number) => void;
  onRegisterPayment: (payable: AccountPayable) => void;
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
  onPageChange,
  onRegisterPayment,
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
    },
    { id: "description", header: "Descripcion", cell: (row) => row.description ?? "-" },
    { id: "purchaseId", header: "Compra", cell: (row) => <span className="text-xs text-black/70">{row.purchaseId}</span> },
    { id: "quotaId", header: "Cuota", cell: (row) => <span className="text-xs text-black/70">{row.quotaId ?? "-"}</span> },
    { id: "amountTotal", header: "Total", cell: (row) => formatMoney(row.amountTotal, row.currency) },
    { id: "amountPaid", header: "Pagado", cell: (row) => formatMoney(row.amountPaid, row.currency) },
    { id: "amountPending", header: "Pendiente", cell: (row) => formatMoney(row.amountPending, row.currency) },
    { id: "dueDate", header: "Vence", cell: (row) => formatDate(row.dueDate) },
    {
      id: "actions",
      header: "Acciones",
      stopRowClick: true,
      hideable: false,
      sortable: false,
      cell: (row) => canRegisterAccountPayablePayment(row.status, canManage) ? (
        <div className="flex justify-end">
          <SystemButton
            size="sm"
            variant="outline"
            onClick={() => onRegisterPayment(row)}
            leftIcon={<CreditCard className="h-4 w-4" />}
          >
            Pagar
          </SystemButton>
        </div>
      ) : null,
      className: "text-right",
      headerClassName: "text-right [&>div]:justify-end",
    },
  ], [canManage, onRegisterPayment]);

  return (
    <DataTable
      tableId="accounts-payable-table"
      data={items}
      columns={columns}
      rowKey="accountPayableId"
      loading={loading}
      emptyMessage="No hay cuentas por pagar para los filtros actuales."
      hoverable={false}
      animated={false}
      pagination={{ page, limit, total }}
      onPageChange={onPageChange}
    />
  );
}

