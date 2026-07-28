import { useState, type ReactNode } from "react";
import { Modal } from "@/shared/components/modales/Modal";
import PurchaseCreateLocal from "@/features/purchases/Purchase";

type Props = {
  open: boolean;
  poId?: string;
  onClose: () => void;
  onSaved?: (poId: string) => void | Promise<void>;
};

export function PurchaseModal({ open, poId, onClose, onSaved }: Props) {
  const [purchaseFooter, setPurchaseFooter] = useState<ReactNode | null>(null);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={poId ? "Editar compra" : "Nueva compra"}
      bodyClassName="p-0"
      footer={purchaseFooter}
    >
      <PurchaseCreateLocal
        inModal
        poIdOverride={poId}
        onClose={onClose}
        onFooterChange={setPurchaseFooter}
        onSaved={onSaved}
      />
    </Modal>
  );
}

