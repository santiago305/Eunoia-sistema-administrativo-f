import { useMemo } from "react";
import { FileCheck2, FileText, History, ReceiptText, RotateCcw, Trash2 } from "lucide-react";
import type { SaleOrder } from "@/features/sale-orders/types/saleOrder";
import { DataTableActionsPopover } from "@/shared/components/components/DataTableActionsPopover";
import type { ActionItem } from "@/shared/components/components/ActionsPopover";

type Props = {
  order: SaleOrder;
  onOpenPdf: (order: SaleOrder) => void;
  onToggleActive?: (order: SaleOrder) => void;
  onOpenAudit?: (order: SaleOrder) => void;
};

export function SaleOrderActionsPopover({
  order,
  onOpenPdf,
  onToggleActive,
  onOpenAudit,
}: Props) {
  const actions = useMemo<ActionItem[]>(
    () => {
      const baseActions: ActionItem[] = [{
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
      }];

      if (onToggleActive) {
        baseActions.push({
          id: order.isActive ? "delete" : "restore",
          label: order.isActive ? "Eliminar" : "Restaurar",
          icon: order.isActive ? <Trash2 className="h-4 w-4" /> : <RotateCcw className="h-4 w-4" />,
          onClick: () => onToggleActive(order),
          danger: order.isActive,
        });
      }

      if (onOpenAudit) {
        baseActions.push({
          id: "audit",
          label: "Auditoria",
          icon: <History className="h-4 w-4" />,
          onClick: () => onOpenAudit(order),
        });
      }

      return baseActions;
    },
    [onOpenAudit, onOpenPdf, onToggleActive, order],
  );

  return <DataTableActionsPopover actions={actions} triggerLabel="Acciones del pedido" />;
}
