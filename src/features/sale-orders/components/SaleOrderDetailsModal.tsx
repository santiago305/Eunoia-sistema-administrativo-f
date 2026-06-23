import { useMemo } from "react";
import { Modal } from "@/shared/components/modales/Modal";
import type { SaleOrder } from "@/features/sale-orders/types/saleOrder";
import { SaleOrderDetailsPanel } from "./sale-order/SaleOrderDetailsPanel";

type Props = {
  open: boolean;
  order: SaleOrder | null;
  onClose: () => void;
  onOrderChanged: () => void | Promise<void>;
};

export function SaleOrderDetailsModal({ open, order, onClose, onOrderChanged }: Props) {
  const title = useMemo(() => {
    if (!order) return "Detalle de pedido";
    return `${order.serie ?? "-"}-${order.correlative ?? "-"}`;
  }, [order]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      className="max-w-6xl overflow-auto"
      bodyClassName="max-h-[85vh] p-4"
    >
      <SaleOrderDetailsPanel
        order={order}
        showActions={false}
        onEdit={() => undefined}
        onOpenPdf={() => undefined}
        onOpenPayments={() => undefined}
        onOrderChanged={() => onOrderChanged()}
      />
    </Modal>
  );
}
