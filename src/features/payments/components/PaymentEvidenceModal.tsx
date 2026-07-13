import { useEffect, useMemo, useState } from "react";
import { ExternalLink, FileText, UploadCloud, X } from "lucide-react";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { Modal } from "@/shared/components/modales/Modal";
import {
  listPurchaseAttachments,
  uploadPurchaseAttachment,
} from "@/shared/services/purchaseAttachmentService";
import { errorResponse, successResponse } from "@/shared/common/utils/response";
import { parseApiError } from "@/shared/common/utils/handleApiError";
import { useFeedbackToast } from "@/shared/hooks/useFeedbackToast";
import {
  PurchaseAttachmentTypes,
  type PurchaseAttachment,
} from "@/features/purchases/types/purchase-attachment.types";
import type { PaymentRecord } from "../types/payment.types";
import { formatPaymentAmount, formatPaymentDate } from "../utils/paymentFormatters";

type Props = {
  open: boolean;
  payment: PaymentRecord | null;
  canViewEvidence: boolean;
  canAttachEvidence: boolean;
  onClose: () => void;
  onUploaded?: () => void | Promise<void>;
};

const formatFileSize = (bytes?: number | null) => {
  if (!bytes) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export function PaymentEvidenceModal({
  open,
  payment,
  canViewEvidence,
  canAttachEvidence,
  onClose,
  onUploaded,
}: Props) {
  const [attachments, setAttachments] = useState<PurchaseAttachment[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { showFeedback } = useFeedbackToast();

  const paymentId = payment?.payDocId ?? null;
  const purchaseId = payment?.poId ?? null;
  const canUpload = Boolean(canAttachEvidence && paymentId && purchaseId);

  const loadAttachments = async () => {
    if (!open || !canViewEvidence || !paymentId || !purchaseId) {
      setAttachments([]);
      return;
    }

    setLoading(true);
    try {
      const data = await listPurchaseAttachments({
        purchaseId,
        paymentId,
        type: PurchaseAttachmentTypes.PAYMENT_PROOF,
      });
      setAttachments(data);
    } catch {
      setAttachments([]);
      showFeedback(errorResponse("No se pudo cargar la evidencia del pago."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    setSelectedFile(null);
    void loadAttachments();
    // loadAttachments closes over current payment and open state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, paymentId, purchaseId, canViewEvidence]);

  const detail = useMemo(() => {
    if (!payment) return "";
    return `${formatPaymentAmount(payment.amount, payment.currency)} · ${formatPaymentDate(payment.date)}`;
  }, [payment]);

  const handleUpload = async () => {
    if (!selectedFile || !paymentId || !purchaseId || uploading) return;

    setUploading(true);
    try {
      const response = await uploadPurchaseAttachment({
        purchaseId,
        paymentId,
        type: PurchaseAttachmentTypes.PAYMENT_PROOF,
        file: selectedFile,
        note: "Evidencia cargada desde el centro de pagos.",
      });

      if (response.type !== "success") {
        showFeedback(errorResponse(response.message || "No se pudo subir la evidencia."));
        return;
      }

      showFeedback(successResponse(response.message || "Evidencia subida correctamente."));
      setSelectedFile(null);
      await loadAttachments();
      await onUploaded?.();
    } catch (error) {
      showFeedback(errorResponse(parseApiError(error, "No se pudo subir la evidencia.")));
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Evidencia de pago"
      description={detail || undefined}
      className="w-full max-w-2xl"
      preventClose={uploading}
      footer={
        <div className="flex justify-end gap-2">
          <SystemButton variant="ghost" onClick={onClose} disabled={uploading}>
            Cerrar
          </SystemButton>
          {canAttachEvidence ? (
            <SystemButton
              leftIcon={<UploadCloud className="h-4 w-4" />}
              onClick={() => void handleUpload()}
              disabled={!selectedFile || !canUpload}
              loading={uploading}
            >
              Subir evidencia
            </SystemButton>
          ) : null}
        </div>
      }
    >
      <div className="space-y-4">
        {!purchaseId ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            Este pago no tiene compra asociada; no se puede gestionar evidencia desde esta vista.
          </div>
        ) : null}

        {canAttachEvidence ? (
          <div className="space-y-2">
            <label className="flex min-h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 px-3 py-4 text-center text-xs text-muted-foreground transition hover:border-primary/50 hover:bg-primary/5">
              <input
                aria-label="Subir comprobante"
                type="file"
                className="sr-only"
                accept=".pdf,.jpg,.jpeg,.png,.webp,.gif,.doc,.docx,.xls,.xlsx,.txt"
                disabled={!canUpload || uploading}
                onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
              />
              <UploadCloud className="h-5 w-5" />
              <span className="font-semibold text-foreground">Comprobante de pago</span>
              <span>{canUpload ? "Selecciona el archivo del pago." : "Falta compra o pago asociado."}</span>
            </label>
            {selectedFile ? (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2 text-xs">
                <span className="min-w-0 truncate">{selectedFile.name}</span>
                <SystemButton type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedFile(null)}>
                  <X className="h-4 w-4" />
                </SystemButton>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground">Comprobantes</h3>
          {!canViewEvidence ? (
            <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
              No tienes permiso para ver la evidencia existente de este pago.
            </div>
          ) : loading ? (
            <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
              Cargando evidencia...
            </div>
          ) : attachments.length === 0 ? (
            <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
              No hay evidencia asociada a este pago.
            </div>
          ) : (
            <div className="divide-y divide-border rounded-lg border border-border">
              {attachments.map((attachment) => (
                <div key={attachment.attachmentId} className="flex items-center gap-3 p-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{attachment.originalName}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(attachment.sizeBytes)} · {formatPaymentDate(attachment.createdAt)}
                    </p>
                  </div>
                  <SystemButton
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => window.open(attachment.url, "_blank", "noopener,noreferrer")}
                    title="Abrir evidencia"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </SystemButton>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
