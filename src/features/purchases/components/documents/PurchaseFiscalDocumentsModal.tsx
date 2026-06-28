import { Modal } from "@/shared/components/modales/Modal";
import { usePurchasePayments } from "@/features/purchases/hooks/usePurchasePayments";
import { PurchaseDocumentsTab } from "./PurchaseDocumentsTab";

type Props = {
  open: boolean;
  purchaseId?: string | null;
  onClose: () => void;
};

export function PurchaseFiscalDocumentsModal({ open, purchaseId, onClose }: Props) {
  const { payments } = usePurchasePayments(open && purchaseId ? purchaseId : undefined);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Comprobantes fiscales"
      description="Documentos fiscales registrados para esta compra."
      className="w-auto max-w-[min(92vw,720px)]"
      bodyClassName="max-h-[78vh]"
    >
      {purchaseId ? (
        <PurchaseDocumentsTab
          purchaseId={purchaseId}
          payments={payments}
          fiscalOnly
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
