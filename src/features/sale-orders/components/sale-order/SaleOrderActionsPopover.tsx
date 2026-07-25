import { useMemo } from "react";
import { FileCheck2, FileText, ReceiptText } from "lucide-react";
import type { SaleOrder } from "@/features/sale-orders/types/saleOrder";
import { DataTableActionsPopover } from "@/shared/components/components/DataTableActionsPopover";
import type { ActionItem } from "@/shared/components/components/ActionsPopover";

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

  return <DataTableActionsPopover actions={actions} triggerLabel="Acciones del pedido" />;
}
