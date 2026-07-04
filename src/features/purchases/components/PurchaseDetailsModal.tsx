import { useEffect, useMemo, useState } from "react";
import { getById } from "@/shared/services/purchaseService";
import { PurchaseOrderStatuses } from "@/features/purchases/types/purchaseEnums";
import { parseApiError } from "@/shared/common/utils/handleApiError";
import { uploadPurchaseImageProdution } from "../utils/purchaseActions";
import { errorResponse, successResponse } from "@/shared/common/utils/response";
import { useFeedbackToast } from "@/shared/hooks/useFeedbackToast";
import { useAuth } from "@/shared/hooks/useAuth";
import { usePermissions } from "@/shared/hooks/usePermissions";
import { DocumentDetailsModal } from "@/shared/components/components/DocumentDetailsModal";
import { DocType, DocStatus } from "@/features/warehouse/types/warehouse";
import type { PurchaseOrderDetailOutput } from "@/features/purchases/types/itemPurchaseEdit";
import type { PurchaseDetailsModalProps } from "@/features/purchases/types/purchaseDetails";
import { buildPurchaseExtendedDetailsConfig } from "@/features/purchases/utils/purchaseDetailsMapper";
import { listPurchaseAttachments } from "@/shared/services/purchaseAttachmentService";
import {
  PurchaseAttachmentTypes,
  type PurchaseAttachment,
} from "@/features/purchases/types/purchase-attachment.types";

export function PurchaseDetailsModal({ open, poId, purchase, onClose }: PurchaseDetailsModalProps) {
  const [detail, setDetail] = useState<PurchaseOrderDetailOutput | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [paymentProofAttachments, setPaymentProofAttachments] = useState<PurchaseAttachment[]>([]);
  const { userRole } = useAuth();
  const { can } = usePermissions();
  const { showFeedback } = useFeedbackToast();
  const canViewPaymentEvidence = can("payments.view_evidence");

  useEffect(() => {
    if (!open || !poId) {
      setDetail(null);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const loadDetail = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await getById(poId);
        if (cancelled) return;
        setDetail(response);
      } catch (err) {
        if (cancelled) return;
        setDetail(null);
        setError(parseApiError(err, "No se pudo cargar el detalle de la compra."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadDetail();

    return () => {
      cancelled = true;
    };
  }, [open, poId]);

  useEffect(() => {
    if (!open || !poId || !canViewPaymentEvidence) {
      setPaymentProofAttachments([]);
      return;
    }

    let cancelled = false;

    const loadPaymentProofs = async () => {
      try {
        const attachments = await listPurchaseAttachments({
          purchaseId: poId,
          type: PurchaseAttachmentTypes.PAYMENT_PROOF,
        });
        if (!cancelled) setPaymentProofAttachments(attachments ?? []);
      } catch {
        if (!cancelled) setPaymentProofAttachments([]);
      }
    };

    void loadPaymentProofs();

    return () => {
      cancelled = true;
    };
  }, [canViewPaymentEvidence, open, poId]);

  const images = useMemo(
    () => detail?.imageProdution ?? purchase?.imageProdution ?? [],
    [detail?.imageProdution, purchase?.imageProdution],
  );

  const isAdmin = (userRole ?? "").toLowerCase() === "admin";
  const canUploadMissingPhoto =
    purchase?.status === PurchaseOrderStatuses.RECEIVED &&
    (isAdmin || can("purchases.attach_documents")) &&
    images.length === 0 &&
    Boolean(poId);

  const handleUploadFromDetail = async (file?: File | null) => {
    if (!poId || !file) return;
    setUploadingPhoto(true);
    try {
      const response = await uploadPurchaseImageProdution(poId, file);
      if (response.type === "success") {
        showFeedback(successResponse(response.message));
        const uploadedImages = response.imageProdution ?? [];
        if (uploadedImages.length) {
          setDetail((current) => ({
            ...(current ?? ({} as PurchaseOrderDetailOutput)),
            imageProdution: uploadedImages,
          }));
        }
        const refreshed = await getById(poId);
        setDetail((current) => ({
          ...refreshed,
          imageProdution: refreshed.imageProdution?.length
            ? refreshed.imageProdution
            : current?.imageProdution ?? [],
        }));
      } else {
        showFeedback(errorResponse(response.message));
      }
    } catch (err) {
      showFeedback(errorResponse(parseApiError(err, "No se pudo subir la foto de compra")));
    } finally {
      setUploadingPhoto(false);
    }
  };

  const extendedDetails = purchase
    ? {
        ...buildPurchaseExtendedDetailsConfig({
          purchase,
          detail,
          canViewPayments: canViewPaymentEvidence,
          paymentProofAttachments,
          canAdminUploadMissingPhoto: canUploadMissingPhoto,
          uploadingPhoto,
          onUploadImage: handleUploadFromDetail,
        }),
        loading,
        error,
      }
    : undefined;

  return (
    <DocumentDetailsModal
      open={open}
      onClose={onClose}
      documentId={null}
      document={
        purchase
          ? {
              id: poId ?? purchase.poId ?? "purchase-detail",
              docType: DocType.PURCHASE,
              productType: null,
              status: DocStatus.POSTED,
              serieId: null,
              serie: null,
              serieCode: null,
              serieSeparator: null,
              seriePadding: null,
              correlative: null,
              fromWarehouseId: null,
              fromWarehouseName: null,
              fromWarehouse: null,
              toWarehouseId: null,
              toWarehouseName: null,
              toWarehouse: null,
              referenceId: null,
              referenceType: null,
              note: null,
              createdById: null,
              createdBy: null,
              postedById: null,
              postedBy: null,
              postedAt: null,
              createdAt: new Date().toISOString(),
            }
          : null
      }
      items={[]}
      extendedDetails={extendedDetails}
    />
  );
}

