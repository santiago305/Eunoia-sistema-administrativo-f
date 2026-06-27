import { Modal } from "@/shared/components/modales/Modal";
import { PurchaseAttachmentTypes } from "@/features/purchases/types/purchase-attachment.types";
import { PurchaseDocumentsTab } from "./PurchaseDocumentsTab";

type Props = {
  open: boolean;
  purchaseId?: string | null;
  onClose: () => void;
};

export function PurchaseFiscalDocumentsModal({ open, purchaseId, onClose }: Props) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Comprobantes fiscales"
      description="Documentos fiscales registrados para esta compra."
      className="w-auto min-w-[min(92vw,520px)] max-w-[min(96vw,1120px)]"
      bodyClassName="max-h-[78vh]"
    >
      {purchaseId ? (
        <PurchaseDocumentsTab
          purchaseId={purchaseId}
          allowedTypes={[PurchaseAttachmentTypes.INVOICE, PurchaseAttachmentTypes.RECEIPT]}
          title="Comprobantes fiscales"
          showUploader
          showLegacyImages={false}
        />
      ) : (
        <div className="rounded-md bg-slate-50 px-3 py-4 text-center text-xs text-black/45">
          No hay compra seleccionada.
        </div>
      )}
    </Modal>
  );
}
