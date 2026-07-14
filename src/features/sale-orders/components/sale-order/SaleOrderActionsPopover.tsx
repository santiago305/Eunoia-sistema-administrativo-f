import { useMemo } from "react";
import { FileCheck2, FileText, Menu, ReceiptText } from "lucide-react";
import type { SaleOrder } from "@/features/sale-orders/types/saleOrder";
import { ActionsPopover, type ActionItem } from "@/shared/components/components/ActionsPopover";

type Props = {
  order: SaleOrder;
  onOpenPdf: (order: SaleOrder) => void;
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
      {
        id: "invoice",
        label: "Factura",
        icon: <FileCheck2 className="h-4 w-4" />,
        disabled: true,
      },
      {
        id: "receipt",
        label: "Boleta",
        icon: <ReceiptText className="h-4 w-4" />,
        disabled: true,
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
      triggerVariant="subtle"
      triggerLabel="Acciones del pedido"
      popoverClassName="min-w-30"
      popoverBodyClassName="p-2"
    />
  );
}
