import { Modal } from "@/components/modales/Modal";
import PurchaseCreateLocal from "@/pages/purchases/Purchase";

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved?: (poId: string) => void | Promise<void>;
};

export function PurchaseModal({ open, onClose, onSaved }: Props) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nueva compra"
      className="w-[min(92rem,calc(100vw-2rem))]"
      bodyClassName="p-0"
    >
      <div className="px-4 pb-4">
        <PurchaseCreateLocal inModal onClose={onClose} onSaved={onSaved} />
      </div>
    </Modal>
  );
}

