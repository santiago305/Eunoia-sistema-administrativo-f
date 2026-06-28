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
  PurchaseAttachmentTypes,
} from "@/features/purchases/types/purchase-attachment.types";
import {
  deletePurchaseAttachment,
  listPurchaseAttachments,
  uploadPurchaseAttachment,
} from "@/shared/services/purchaseAttachmentService";
import { PurchaseAttachmentUploader } from "./PurchaseAttachmentUploader";
import { PurchaseAttachmentViewer } from "./PurchaseAttachmentViewer";
import { OperationImageGallery } from "@/shared/components/components/OperationImageGallery";

const fiscalAttachmentTypes = new Set<PurchaseAttachmentType>([
  PurchaseAttachmentTypes.FISCAL_DOCUMENT,
  PurchaseAttachmentTypes.INVOICE,
  PurchaseAttachmentTypes.RECEIPT,
]);

const isFiscalAttachment = (attachment: PurchaseAttachment) => fiscalAttachmentTypes.has(attachment.type);

type Props = {
  purchaseId: string;
  payments?: Payment[];
  legacyImages?: string[];
  allowedTypes?: PurchaseAttachmentType[];
  fiscalOnly?: boolean;
  title?: string;
  showUploader?: boolean;
  showLegacyImages?: boolean;
};

export function PurchaseDocumentsTab({
  purchaseId,
  payments = [],
  legacyImages = [],
  allowedTypes,
  fiscalOnly = false,
  title = "Documentos",
  showUploader = true,
  showLegacyImages = true,
}: Props) {
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
    fiscalDocumentType?: import("@/features/purchases/types/purchaseEnums").VoucherDocType | null;
    file: File;
    paymentId?: string | null;
    note?: string | null;
  }) => {
    setUploading(true);
    try {
      const response = await uploadPurchaseAttachment({
        purchaseId,
        type: params.type,
        fiscalDocumentType: params.fiscalDocumentType ?? null,
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

  const visibleAttachments = useMemo(
    () => {
      if (fiscalOnly) {
        return attachments.filter((attachment) => isFiscalAttachment(attachment));
      }
      return allowedTypes?.length
        ? attachments.filter((attachment) => allowedTypes.includes(attachment.type))
        : attachments;
    },
    [allowedTypes, attachments, fiscalOnly],
  );

  const fiscalAttachmentExists = fiscalOnly && visibleAttachments.length > 0;

  const totalCountLabel = useMemo(
    () => {
      const documentCount = visibleAttachments.length;
      const photoCount = showLegacyImages ? legacyImages.length : 0;
      const parts = [
        `${documentCount} documento${documentCount === 1 ? "" : "s"}`,
        photoCount ? `${photoCount} foto${photoCount === 1 ? "" : "s"} de compra` : null,
      ].filter(Boolean);
      return loading ? "Cargando..." : parts.join(" · ");
    },
    [legacyImages.length, loading, showLegacyImages, visibleAttachments.length],
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
            {title}
          </h4>
        </div>
        <span className="text-[11px] text-black/40">
          {totalCountLabel}
        </span>
      </div>

      <div className="space-y-3">
        {showUploader && canUpload && !fiscalAttachmentExists ? (
          <PurchaseAttachmentUploader
            payments={payments}
            loading={uploading}
            canUpload={canUpload}
            allowedTypes={allowedTypes}
            fiscalMode={fiscalOnly}
            onUpload={handleUpload}
          />
        ) : null}
        {fiscalAttachmentExists ? (
          <div className="rounded-md border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800">
            El comprobante fiscal ya fue registrado para esta compra.
          </div>
        ) : null}
        <PurchaseAttachmentViewer
          attachments={visibleAttachments}
          canDelete={canDelete}
          deletingId={deletingId}
          onDelete={handleDelete}
        />
        {showLegacyImages && legacyImages.length ? (
          <div className="overflow-hidden rounded-md border border-black/5">
            <div className="flex items-center justify-between border-b border-black/5 bg-slate-50 px-3 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-black/55">
                Fotos de compra
              </p>
              <span className="text-[10px] text-black/40">
                {legacyImages.length} foto{legacyImages.length === 1 ? "" : "s"}
              </span>
            </div>
            <div className="p-3">
              <OperationImageGallery
                images={legacyImages}
                altPrefix="Foto de compra"
                emptyMessage="Esta compra no tiene foto."
              />
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
