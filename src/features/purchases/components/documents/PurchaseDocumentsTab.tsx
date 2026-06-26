import { useCallback, useEffect, useMemo, useState } from "react";
import { FileText } from "lucide-react";
import { errorResponse, successResponse } from "@/shared/common/utils/response";
import { parseApiError } from "@/shared/common/utils/handleApiError";
import { useFeedbackToast } from "@/shared/hooks/useFeedbackToast";
import { usePermissions } from "@/shared/hooks/usePermissions";
import type { Payment } from "@/features/purchases/types/purchase";
import type {
  PurchaseAttachment,
  PurchaseAttachmentType,
} from "@/features/purchases/types/purchase-attachment.types";
import {
  deletePurchaseAttachment,
  listPurchaseAttachments,
  uploadPurchaseAttachment,
} from "@/shared/services/purchaseAttachmentService";
import { PurchaseAttachmentUploader } from "./PurchaseAttachmentUploader";
import { PurchaseAttachmentViewer } from "./PurchaseAttachmentViewer";

type Props = {
  purchaseId: string;
  payments?: Payment[];
  legacyImages?: string[];
};

export function PurchaseDocumentsTab({ purchaseId, payments = [], legacyImages = [] }: Props) {
  const [attachments, setAttachments] = useState<PurchaseAttachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { showFeedback } = useFeedbackToast();
  const { can } = usePermissions();

  const canView = can("purchases.view_detail");
  const canUpload = can("purchases.attach_documents");
  const canDelete = can("purchases.delete_documents");

  const loadAttachments = useCallback(async () => {
    if (!purchaseId || !canView) return;
    setLoading(true);
    try {
      const rows = await listPurchaseAttachments({ purchaseId });
      setAttachments(rows);
    } catch (error) {
      setAttachments([]);
      showFeedback(errorResponse(parseApiError(error, "No se pudieron cargar los documentos.")));
    } finally {
      setLoading(false);
    }
  }, [canView, purchaseId, showFeedback]);

  useEffect(() => {
    void loadAttachments();
  }, [loadAttachments]);

  const handleUpload = async (params: {
    type: PurchaseAttachmentType;
    file: File;
    paymentId?: string | null;
    note?: string | null;
  }) => {
    setUploading(true);
    try {
      const response = await uploadPurchaseAttachment({
        purchaseId,
        type: params.type,
        file: params.file,
        paymentId: params.paymentId ?? null,
        note: params.note ?? null,
      });
      if (response.type === "success") {
        showFeedback(successResponse(response.message));
        await loadAttachments();
      } else {
        showFeedback(errorResponse(response.message));
      }
    } catch (error) {
      showFeedback(errorResponse(parseApiError(error, "No se pudo subir el documento.")));
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (attachmentId: string) => {
    setDeletingId(attachmentId);
    try {
      const response = await deletePurchaseAttachment(attachmentId);
      if (response.type === "success") {
        showFeedback(successResponse(response.message));
        await loadAttachments();
      } else {
        showFeedback(errorResponse(response.message));
      }
    } catch (error) {
      showFeedback(errorResponse(parseApiError(error, "No se pudo eliminar el documento.")));
    } finally {
      setDeletingId(null);
    }
  };

  const legacyCountLabel = useMemo(
    () => legacyImages.length ? `${legacyImages.length} imagen${legacyImages.length === 1 ? "" : "es"} legacy` : "Sin imagen legacy",
    [legacyImages.length],
  );

  if (!canView) {
    return null;
  }

  return (
    <section>
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 text-black/60">
          <FileText className="h-3.5 w-3.5" />
          <h4 className="text-[11px] font-medium uppercase tracking-[0.14em] text-black/55">
            Documentos
          </h4>
        </div>
        <span className="text-[11px] text-black/40">
          {loading ? "Cargando..." : `${attachments.length} formales · ${legacyCountLabel}`}
        </span>
      </div>

      <div className="space-y-3">
        {canUpload ? (
          <PurchaseAttachmentUploader payments={payments} loading={uploading} canUpload={canUpload} onUpload={handleUpload} />
        ) : null}
        <PurchaseAttachmentViewer
          attachments={attachments}
          canDelete={canDelete}
          deletingId={deletingId}
          onDelete={handleDelete}
        />
        {legacyImages.length ? (
          <div className="overflow-hidden rounded-md border border-amber-200 bg-amber-50/60">
            <div className="flex items-center justify-between border-b border-amber-200 px-3 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-800">
                Evidencia legacy
              </p>
              <span className="text-[10px] text-amber-700">
                Solo lectura
              </span>
            </div>
            <div className="grid gap-2 p-3 sm:grid-cols-2">
              {legacyImages.map((url, index) => (
                <a
                  key={`${url}-${index}`}
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="block overflow-hidden rounded-md border border-amber-200 bg-white text-xs text-amber-900 hover:border-amber-300"
                >
                  <div className="aspect-video bg-amber-100">
                    <img
                      src={url}
                      alt={`Evidencia legacy ${index + 1}`}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <div className="truncate px-2 py-1.5">
                    image_prodution #{index + 1}
                  </div>
                </a>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
