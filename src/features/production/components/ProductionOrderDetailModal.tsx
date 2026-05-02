import { useMemo, useState, useCallback } from "react";
import { Factory } from "lucide-react";
import { DocStatus, DocType } from "@/features/warehouse/types/warehouse";
import { DocumentDetailsModal } from "@/shared/components/components/DocumentDetailsModal";
import { uploadProductionImageProdution } from "@/features/production/utils/productionActions";
import { useFlashMessage } from "@/shared/hooks/useFlashMessage";
import { errorResponse, successResponse } from "@/shared/common/utils/response";
import { ProductionStatus, type ProductionOrder } from "@/features/production/types/production";

type ProductionOrderDetailModalProps = {
  open: boolean;
  loading: boolean;
  order: ProductionOrder | null;
  canAdminUploadMissingPhoto?: boolean;
  onUploadedPhoto?: () => Promise<void> | void;
  onClose: () => void;
};

const statusLabels: Record<ProductionStatus, string> = {
  [ProductionStatus.DRAFT]: "Borrador",
  [ProductionStatus.IN_PROGRESS]: "En proceso",
  [ProductionStatus.PARTIAL]: "Parcial",
  [ProductionStatus.COMPLETED]: "Completado",
  [ProductionStatus.CANCELLED]: "Cancelado",
};

const mapProductionStatusToDocStatus = (status?: ProductionStatus): DocStatus => {
  if (status === ProductionStatus.CANCELLED) return DocStatus.CANCELLED;
  if (status === ProductionStatus.COMPLETED) return DocStatus.POSTED;
  return DocStatus.DRAFT;
};

export function ProductionOrderDetailModal({
  open,
  loading,
  order,
  canAdminUploadMissingPhoto = false,
  onUploadedPhoto,
  onClose,
}: ProductionOrderDetailModalProps) {
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const { showFlash } = useFlashMessage();

  const handleUploadFromDetail = useCallback(async (file?: File | null) => {
    const productionId = order?.productionId ?? order?.id;
    if (!productionId || !file) return;

    setUploadingPhoto(true);

    try {
      const response = await uploadProductionImageProdution(productionId, file);

      if (response.type === "success") {
        showFlash(successResponse(response.message));
        await onUploadedPhoto?.();
      } else {
        showFlash(errorResponse(response.message));
      }
    } catch {
      showFlash(errorResponse("No se pudo subir la foto de produccion"));
    } finally {
      setUploadingPhoto(false);
    }
  }, [order, showFlash, onUploadedPhoto]);

  const extendedDetails = useMemo(() => {
    if (!order) return undefined;

    const number = order.serie?.code
      ? `${order.serie.code} - ${order.correlative ?? ""}`
      : "-";

    const items = (order.items ?? []).map((item, index) => ({
      id: item.id ?? item.itemId ?? `${item.finishedItemId}-${index}`,
      label:
        item.finishedItem?.sku?.name ??
        item.finishedItem?.variant?.productName ??
        item.finishedItem?.product?.name ??
        `Producto ${index + 1}`,
      code:
        item.finishedItem?.sku?.backendSku ??
        item.finishedItem?.sku?.customSku ??
        item.finishedItemId,
      unit: item.finishedItem?.sku?.unitName ?? item.finishedItem?.variant?.unitName ?? undefined,
      quantity: item.quantity,
    }));

    return {
      title: "Detalle de orden de produccion",
      loading,
      headerIcon: <Factory className="h-3.5 w-3.5" />,
      headerIconClassName: "bg-violet-100 text-violet-700",
      headerLabel: "Produccion",
      headerBadge: order.status ? statusLabels[order.status] ?? order.status : null,
      headerBadgeClassName: "bg-violet-50 text-violet-700",
      headerNumber: number,
      headerSubLabel: `${order.fromWarehouse?.name ?? order.fromWarehouseId ?? "-"} -> ${order.toWarehouse?.name ?? order.toWarehouseId ?? "-"}`,
      summaryTopFields: [
        { label: "Usuario", value: order.createdByName ?? order.createdBy ?? "-" },
        { label: "Origen", value: order.fromWarehouse?.name ?? order.fromWarehouseId ?? "-" },
        { label: "Destino", value: order.toWarehouse?.name ?? order.toWarehouseId ?? "-" },
      ],
      itemsTitle: "Items producidos",
      itemsMeta: `${items.length} registrados en la orden`,
      items,
      itemsEmptyMessage: "Esta orden no tiene items para mostrar.",
      images: order.imageProdution ?? [],
      imageTitle: "Foto de produccion",
      imageAltPrefix: "Imagen de produccion",
      imageEmptyMessage: "Esta produccion no tiene foto.",
      canUploadImage: canAdminUploadMissingPhoto,
      uploadingImage: uploadingPhoto,
      onUploadImage: handleUploadFromDetail,
    };
  }, [order, loading, canAdminUploadMissingPhoto, uploadingPhoto, handleUploadFromDetail]);
  return (
    <DocumentDetailsModal
      open={open}
      onClose={onClose}
      documentId={null}
      document={
        order
          ? {
              id: order.productionId ?? order.id ?? "production-detail",
              docType: DocType.PRODUCTION,
              productType: null,
              status: mapProductionStatusToDocStatus(order.status),
              serieId: order.serieId,
              serie: order.serie?.code ?? null,
              serieCode: order.serie?.code ?? null,
              serieSeparator: "-",
              seriePadding: null,
              correlative: order.correlative ?? null,
              fromWarehouseId: order.fromWarehouseId,
              fromWarehouseName: order.fromWarehouse?.name ?? null,
              fromWarehouse: null,
              toWarehouseId: order.toWarehouseId,
              toWarehouseName: order.toWarehouse?.name ?? null,
              toWarehouse: null,
              referenceId: order.reference ?? null,
              referenceType: null,
              note: null,
              createdById: null,
              createdBy: order.createdBy
                ? { id: order.createdBy, name: order.createdByName ?? null, email: null }
                : null,
              postedById: null,
              postedBy: null,
              postedAt: null,
              createdAt: order.createdAt ?? new Date().toISOString(),
            }
          : null
      }
      items={[]}
      extendedDetails={extendedDetails}
    />
  );
}
