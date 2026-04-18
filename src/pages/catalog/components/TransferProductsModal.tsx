import { Modal } from "@/components/modales/Modal";
import TransferProducts from "@/pages/catalog/TransferFormProducts";

type Props = {
    open: boolean;
    onClose: () => void;
    onSaved?: (transferId: string) => void | Promise<void>;
};

export function TransferProductsModal({ open, onClose, onSaved }: Props) {
    return (
        <Modal open={open} onClose={onClose} closeOnOverlayClick={false} title="Nueva transferencia" className="w-[min(92rem,calc(100vw-2rem))]" bodyClassName="p-0">
            <div className="px-4 pb-4">
                <TransferProducts inModal onClose={onClose} onSaved={onSaved} />
            </div>
        </Modal>
    );
}
