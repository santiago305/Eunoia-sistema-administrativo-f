import { useMemo } from "react";
import {  FileText, Menu,  } from "lucide-react";
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
  onOpenPdf,
}: Props) {
  const actions = useMemo<ActionItem[]>(
    () => [
      {
        id: "pdf",
        label: "Ver PDF",
        icon: <FileText className="h-4 w-4" />,
        onClick: () => onOpenPdf(order),
      },
    ],
    [onOpenPdf, order],
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
