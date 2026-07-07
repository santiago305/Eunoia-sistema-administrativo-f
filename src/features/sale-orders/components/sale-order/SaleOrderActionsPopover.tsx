import { useMemo } from "react";
import { Banknote, FileText, Menu, Pencil, Trash2 } from "lucide-react";
import type { SaleOrder } from "@/features/sale-orders/types/saleOrder";
import { ActionsPopover, type ActionItem } from "@/shared/components/components/ActionsPopover";

type Props = {
  order: SaleOrder;
  onEdit: (order: SaleOrder) => void;
  onOpenPdf: (order: SaleOrder) => void;
  onOpenPayments: (order: SaleOrder) => void;
  onDelete: (order: SaleOrder) => void;
};

export function SaleOrderActionsPopover({
  order,
  onEdit,
  onOpenPdf,
  onOpenPayments,
  onDelete,
}: Props) {
  const actions = useMemo<ActionItem[]>(
    () => [
      {
        id: "edit",
        label: "Editar",
        icon: <Pencil className="h-4 w-4" />,
        onClick: () => onEdit(order),
      },
      {
        id: "pdf",
        label: "Ver PDF",
        icon: <FileText className="h-4 w-4" />,
        onClick: () => onOpenPdf(order),
      },
      {
        id: "payments",
        label: "Pagos",
        icon: <Banknote className="h-4 w-4" />,
        onClick: () => onOpenPayments(order),
      },
      {
        id: "delete",
        label: "Eliminar",
        icon: <Trash2 className="h-4 w-4" />,
        danger: true,
        className: "text-rose-700 hover:bg-rose-50",
        onClick: () => onDelete(order),
      },
    ],
    [onDelete, onEdit, onOpenPayments, onOpenPdf, order],
  );

  return (
    <ActionsPopover
      actions={actions}
      columns={1}
      compact
      showLabels
      triggerIcon={<Menu className="h-5 w-5 text-black text-bold" />}
      triggerVariant="ghost"
      triggerLabel="Acciones del pedido"
      popoverClassName="min-w-[180px]"
      popoverBodyClassName="p-2"
    />
  );
}
