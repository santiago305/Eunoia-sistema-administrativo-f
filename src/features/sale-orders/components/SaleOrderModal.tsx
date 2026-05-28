import { Modal } from "@/shared/components/modales/Modal";
import SaleOrderCreate from "@/features/sale-orders/components/SaleOrderCreate";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function SaleOrderModal({ open, onClose }: Props) {
  return (
    <Modal open={open} onClose={onClose} title="Nuevo pedido" bodyClassName="p-0"
    className="w-[1000px]">
      <SaleOrderCreate inModal onClose={onClose} />
    </Modal>
  );
}

