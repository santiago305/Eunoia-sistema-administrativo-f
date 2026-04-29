import { Modal } from "@/shared/components/modales/Modal";
import TransferProducts from "@/features/catalog/products/components/TransferFormProducts";
import { InventoryDocumentProductType } from "@/features/catalog/types/documentInventory";

type Props = {
    open: boolean;
    onClose: () => void;
    onSaved?: (transferId: string) => void | Promise<void>;
    type?: InventoryDocumentProductType;
    initialSku?: {
        skuId: string;
        name?: string;
        backendSku?: string;
        customSku?: string | null;
    } | null;
};

export function TransferProductsModal({ open, onClose, onSaved, type, initialSku }: Props) {
    return (
        <Modal open={open} onClose={onClose}  title="Nueva transferencia" className="w-[min(92rem,calc(100vw-2rem))]" bodyClassName="p-0">
            <TransferProducts onClose={onClose} onSaved={onSaved} type={type} open={open} initialSku={initialSku} />
        </Modal>
    );
}
