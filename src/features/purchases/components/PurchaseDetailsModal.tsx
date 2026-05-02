import { useEffect, useMemo, useState } from "react";
import { getById } from "@/shared/services/purchaseService";
import { parseApiError } from "@/shared/common/utils/handleApiError";
import { uploadPurchaseImageProdution } from "../utils/purchaseActions";
import { errorResponse, successResponse } from "@/shared/common/utils/response";
import { useFlashMessage } from "@/shared/hooks/useFlashMessage";
import { useAuth } from "@/shared/hooks/useAuth";
import { DocumentInventoryDetails } from "@/shared/components/components/DocumentInventoryDetails";
import { DocType, DocStatus } from "@/features/warehouse/types/warehouse";
import type { PurchaseOrderDetailOutput } from "@/features/purchases/types/itemPurchaseEdit";
import type { PurchaseDetailsModalProps } from "@/features/purchases/types/purchaseDetails";
import { buildPurchaseExtendedDetailsConfig } from "@/features/purchases/utils/purchaseDetailsMapper";

export function PurchaseDetailsModal({ open, poId, purchase, onClose }: PurchaseDetailsModalProps) {
  const [detail, setDetail] = useState<PurchaseOrderDetailOutput | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const { userRole } = useAuth();
  const { showFlash } = useFlashMessage();

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

  const images = useMemo(
    () => detail?.imageProdution ?? purchase?.imageProdution ?? [],
    [detail?.imageProdution, purchase?.imageProdution],
  );

  const isAdmin = (userRole ?? "").toLowerCase() === "admin";
  const canAdminUploadMissingPhoto = isAdmin && images.length === 0 && Boolean(poId);

  const handleUploadFromDetail = async (file?: File | null) => {
    if (!poId || !file) return;
    setUploadingPhoto(true);
    try {
      const response = await uploadPurchaseImageProdution(poId, file);
      if (response.type === "success") {
        showFlash(successResponse(response.message));
        const refreshed = await getById(poId);
        setDetail(refreshed);
      } else {
        showFlash(errorResponse(response.message));
      }
    } catch (err) {
      showFlash(errorResponse(parseApiError(err, "No se pudo subir la foto de compra")));
    } finally {
      setUploadingPhoto(false);
    }
  };

  const extendedDetails = purchase
    ? {
        ...buildPurchaseExtendedDetailsConfig({
          purchase,
          detail,
          canAdminUploadMissingPhoto,
          uploadingPhoto,
          onUploadImage: handleUploadFromDetail,
        }),
        loading,
        error,
      }
    : undefined;

  return (
    <DocumentInventoryDetails
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
