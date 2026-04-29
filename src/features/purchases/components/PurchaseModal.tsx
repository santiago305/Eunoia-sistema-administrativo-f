import { Modal } from "@/shared/components/modales/Modal";
import PurchaseCreateLocal from "@/features/purchases/Purchase";

type Props = {
  open: boolean;
  poId?: string;
  onClose: () => void;
  onSaved?: (poId: string) => void | Promise<void>;
};

export function PurchaseModal({ open, poId, onClose, onSaved }: Props) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      
      title={poId ? "Editar compra" : "Nueva compra"}
      className="w-[min(92rem,calc(100vw-2rem))]"
      bodyClassName="p-0"
    >
      <PurchaseCreateLocal
        inModal
        poIdOverride={poId}
        onClose={onClose}
        onSaved={onSaved}
      />
    </Modal>
  );
}

