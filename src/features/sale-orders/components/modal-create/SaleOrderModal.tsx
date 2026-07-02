import { Modal } from "@/shared/components/modales/Modal";
import SaleOrderCreate from "@/features/sale-orders/components/modal-create/SaleOrderCreate";

type Props = {
    open: boolean;
    onClose: () => void;
    orderId?: string | null;
    onSaved?: () => void;
};

export function SaleOrderModal({ open, onClose, orderId, onSaved }: Props) {
    return (
        <Modal open={open} onClose={onClose} title={orderId ? "Editar pedido" : "Nuevo pedido"} bodyClassName="p-0" className="w-[1000px]">
            <SaleOrderCreate inModal orderId={orderId} onClose={onClose} onSaved={onSaved} />
        </Modal>
    );
}
