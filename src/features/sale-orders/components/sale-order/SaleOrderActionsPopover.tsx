import { useMemo } from "react";
import { CreditCard, FileText, Menu } from "lucide-react";
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
  onOpenPayments,
}: Props) {
  const actions = useMemo<ActionItem[]>(
    () => [
      {
        id: "payments",
        label: "Pagos",
        icon: <CreditCard className="h-4 w-4" />,
        onClick: () => onOpenPayments(order),
      },
      {
        id: "pdf",
        label: "Ver PDF",
        icon: <FileText className="h-4 w-4" />,
        onClick: () => onOpenPdf(order),
      },
      {
        id: "boleta",
        label: "generar factura",
        icon: <FileText className="h-4 w-4" />,
        onClick: () => onOpenPdf(order),
        disabled:true
      },
      {
        id: "factura",
        label: "generar boleta",
        icon: <FileText className="h-4 w-4" />,
        onClick: () => onOpenPdf(order),
        disabled:true
      },
    ],
    [onOpenPayments, onOpenPdf, order],
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
