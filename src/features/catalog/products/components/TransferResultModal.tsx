import { PdfViewerModal } from "@/shared/components/components/ModalOpenPdf";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { getDocumentInventoryPdf } from "@/shared/services/pdfServices";
import type { TransferResultModalProps } from "@/features/catalog/types/transfer";
import { useCallback } from "react";

export function TransferResultModal({
  open,
  transferId,
  onNew,
  onGoToList,
  onClose,
  title,
  goToLabel,
}: TransferResultModalProps) {
  const loadTransferPdf = useCallback(() => {
    if (!transferId) {
      return Promise.reject(new Error("Missing transfer id"));
    }
    return getDocumentInventoryPdf(transferId);
  }, [transferId]);

  return (
    <PdfViewerModal
      open={open}
      onClose={onClose}
      title={title}
      loadWhen={Boolean(transferId)}
      reloadKey={transferId ?? null}
      iframeTitle={transferId ? `documento-transfer-${transferId}` : "documento-transfer"}
      getPdf={loadTransferPdf}
      footer={
        <div className="flex flex-col gap-3 sm:flex-row">
          <SystemButton variant="outline" onClick={onNew} className="flex-1">
            Ingresar nueva transferencia
          </SystemButton>
          <SystemButton onClick={onGoToList} className="flex-1">
            {goToLabel}
          </SystemButton>
        </div>
      }
    />
  );
}
