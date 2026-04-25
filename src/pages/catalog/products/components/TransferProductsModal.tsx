import { Modal } from "@/components/modales/Modal";
import TransferProducts from "@/pages/catalog/products/components/TransferFormProducts";
import { InventoryDocumentProductType } from "@/pages/catalog/types/documentInventory";

type Props = {
    open: boolean;
    onClose: () => void;
    onSaved?: (transferId: string) => void | Promise<void>;
    type?: InventoryDocumentProductType;
};

export function TransferProductsModal({ open, onClose, onSaved, type }: Props) {
    return (
        <Modal open={open} onClose={onClose} closeOnOverlayClick={false} title="Nueva transferencia" className="w-[min(92rem,calc(100vw-2rem))]" bodyClassName="p-0">
            <div className="px-4 pb-4">
                <TransferProducts inModal onClose={onClose} onSaved={onSaved} type={type} />
            </div>
        </Modal>
    );
}
