import { useMemo } from "react";
import { DataTable } from "@/shared/components/table/DataTable";
import type { DataTableColumn } from "@/shared/components/table/types";
import type { PaymentMethod } from "../types/paymentMethod";
import { PaymentMethodActionsMenu } from "./PaymentMethodActionsMenu";
import { PaymentMethodStatusBadge } from "./PaymentMethodStatusBadge";

type Props = {
  methods: PaymentMethod[];
  loading: boolean;
  canManage: boolean;
  busyMethodId?: string | null;
  toolbarSearchContent?: React.ReactNode;
  onEdit: (method: PaymentMethod) => void;
  onToggleActive: (method: PaymentMethod) => void;
};

export function PaymentMethodsTable({
  methods,
  loading,
  canManage,
  busyMethodId = null,
  toolbarSearchContent,
  onEdit,
  onToggleActive,
}: Props) {
  const columns = useMemo<DataTableColumn<PaymentMethod>[]>(
    () => [
      {
        id: "name",
        header: "Metodo",
        accessorKey: "name",
        hideable: false,
        cell: (row) => (
          <div className="min-w-0">
            <span className="font-medium text-black/80">{row.name}</span>
            <p className="text-[11px] text-black/45">Catalogo global de pagos</p>
          </div>
        ),
      },
      {
        id: "requiresVoucher",
        header: "Voucher",
        accessorKey: "requiresVoucher",
        sortAccessor: "requiresVoucher",
        searchValue: (row) => (row.requiresVoucher ? "voucher obligatorio" : "sin voucher"),
        cell: (row) => (
          <span className="text-black/70">
            {row.requiresVoucher ? "Obligatorio" : "No requerido"}
          </span>
        ),
      },
      {
        id: "isActive",
        header: "Estado",
        accessorKey: "isActive",
        sortAccessor: "isActive",
        cell: (row) => <PaymentMethodStatusBadge isActive={row.isActive} />,
      },
      {
        id: "actions",
        header: "Acciones",
        stopRowClick: true,
        hideable: false,
        sortable: false,
        className: "text-right",
        headerClassName: "text-right [&>div]:justify-end",
        cell: (row) => (
          <PaymentMethodActionsMenu
            method={row}
            canManage={canManage}
            busy={busyMethodId === row.methodId}
            onEdit={onEdit}
            onToggleActive={onToggleActive}
          />
        ),
      },
    ],
    [busyMethodId, canManage, onEdit, onToggleActive],
  );

  return (
    <DataTable
      tableId="payment-methods-table"
      data={methods}
      columns={columns}
      rowKey="methodId"
      loading={loading}
      emptyMessage="No hay metodos de pago registrados."
      selectableColumns
      toolbarSearchContent={toolbarSearchContent}
      hoverable={false}
      animated={false}
    />
  );
}
