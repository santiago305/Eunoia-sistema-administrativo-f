import { PdfViewerModal } from "@/shared/components/components/ModalOpenPdf";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { getDocumentInventoryPdf } from "@/shared/services/pdfServices";
import { useCallback } from "react";

export type AdjustmentResultModalProps = {
  open: boolean;
  adjustmentId?: string;
  onNew: () => void;
  onGoToList: () => void;
  onClose: () => void;
  title: string;
  goToLabel: string;
};

export function AdjustmentResultModal({
  open,
  adjustmentId,
  onNew,
  onGoToList,
  onClose,
  title,
  goToLabel,
}: AdjustmentResultModalProps) {
  const loadAdjustmentPdf = useCallback(() => {
    if (!adjustmentId) {
      return Promise.reject(new Error("Missing adjustment id"));
    }
    return getDocumentInventoryPdf(adjustmentId);
  }, [adjustmentId]);

  return (
    <PdfViewerModal
      open={open}
      onClose={onClose}
      title={title}
      loadWhen={Boolean(adjustmentId)}
      reloadKey={adjustmentId ?? null}
      iframeTitle={adjustmentId ? `documento-ajuste-${adjustmentId}` : "documento-ajuste"}
      getPdf={loadAdjustmentPdf}
      footer={
        <div className="flex flex-col gap-3 sm:flex-row">
          <SystemButton variant="outline" onClick={onNew} className="flex-1">
            Ingresar nuevo ajuste
          </SystemButton>
          <SystemButton onClick={onGoToList} className="flex-1">
            {goToLabel}
          </SystemButton>
        </div>
      }
    />
  );
}
