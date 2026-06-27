import { Download, FileText, Image, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { Modal } from "@/shared/components/modales/Modal";
import { env } from "@/env";
import { ImagePreviewModal } from "@/shared/components/components/ImagePreviewModal";
import {
  purchaseAttachmentTypeLabels,
  PurchaseAttachmentTypes,
  type PurchaseAttachment,
  type PurchaseAttachmentType,
} from "@/features/purchases/types/purchase-attachment.types";

const formatSize = (sizeBytes: number) => {
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) return "-";
  if (sizeBytes < 1024 * 1024) return `${(sizeBytes / 1024).toFixed(1)} KB`;
  return `${(sizeBytes / 1024 / 1024).toFixed(2)} MB`;
};

const formatDate = (value?: string | null) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

type Props = {
  attachments: PurchaseAttachment[];
  canDelete?: boolean;
  deletingId?: string | null;
  onDelete?: (attachmentId: string) => Promise<void> | void;
};

const resolveAttachmentUrl = (rawUrl?: string | null) => {
  const raw = rawUrl?.trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  try {
    return new URL(raw, env.apiBaseUrl).toString();
  } catch {
    return raw;
  }
};

const getAttachmentName = (attachment: PurchaseAttachment) =>
  attachment.originalName || attachment.filename || "Documento";

const isImageAttachment = (attachment: PurchaseAttachment) =>
  attachment.mimeType?.startsWith("image/") ||
  /\.(png|jpe?g|webp|gif|bmp|avif)$/i.test(attachment.url);

const isPdfAttachment = (attachment: PurchaseAttachment) =>
  attachment.mimeType === "application/pdf" || /\.pdf$/i.test(attachment.url);

const getGridColumnsClass = (count: number) => {
  if (count <= 1) return "grid-cols-1";
  if (count <= 4) return "grid-cols-1 sm:grid-cols-2";
  if (count <= 9) return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";
  return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";
};

const documentGroups: Array<{
  key: string;
  label: string;
  types: PurchaseAttachmentType[];
}> = [
  {
    key: "fiscal",
    label: "Comprobantes fiscales",
    types: [PurchaseAttachmentTypes.INVOICE, PurchaseAttachmentTypes.RECEIPT],
  },
  {
    key: "payments",
    label: "Pagos",
    types: [PurchaseAttachmentTypes.PAYMENT_PROOF],
  },
  {
    key: "reception",
    label: "Recepcion",
    types: [
      PurchaseAttachmentTypes.DELIVERY_NOTE,
      PurchaseAttachmentTypes.SERVICE_EVIDENCE,
    ],
  },
  {
    key: "purchase-photos",
    label: "Fotos de compra",
    types: [
      PurchaseAttachmentTypes.PRODUCT_PHOTO,
    ],
  },
  {
    key: "other",
    label: "Otros",
    types: [PurchaseAttachmentTypes.QUOTATION, PurchaseAttachmentTypes.CONTRACT, PurchaseAttachmentTypes.OTHER],
  },
];

export function PurchaseAttachmentViewer({ attachments, canDelete = false, deletingId, onDelete }: Props) {
  const [documentPreviewAttachment, setDocumentPreviewAttachment] = useState<PurchaseAttachment | null>(null);
  const [imagePreviewAttachment, setImagePreviewAttachment] = useState<PurchaseAttachment | null>(null);

  const documentPreviewUrl = useMemo(
    () => resolveAttachmentUrl(documentPreviewAttachment?.url),
    [documentPreviewAttachment],
  );
  const imagePreviewUrl = useMemo(
    () => resolveAttachmentUrl(imagePreviewAttachment?.url),
    [imagePreviewAttachment],
  );
  const isDocumentPreviewPdf = Boolean(documentPreviewAttachment && isPdfAttachment(documentPreviewAttachment));
  const documentPreviewName = documentPreviewAttachment ? getAttachmentName(documentPreviewAttachment) : "Documento";
  const imagePreviewName = imagePreviewAttachment ? getAttachmentName(imagePreviewAttachment) : "Documento";

  const openAttachmentPreview = (attachment: PurchaseAttachment) => {
    if (isImageAttachment(attachment)) {
      setImagePreviewAttachment(attachment);
      return;
    }
    setDocumentPreviewAttachment(attachment);
  };

  if (!attachments.length) {
    return (
      <div className="rounded-md bg-slate-50 px-3 py-4 text-center text-xs text-black/45">
        No hay documentos formales registrados.
      </div>
    );
  }

  const grouped = documentGroups
    .map((group) => ({
      ...group,
      rows: attachments.filter((attachment) => group.types.includes(attachment.type)),
    }))
    .filter((group) => group.rows.length > 0);

  return (
    <div data-testid="purchase-attachment-viewer" className="max-h-[68vh] space-y-3 overflow-y-auto pr-1">
      {grouped.map((group) => (
        <div key={group.key} className="overflow-hidden rounded-md border border-black/5">
          <div className="flex items-center justify-between border-b border-black/5 bg-slate-50 px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-black/55">
              {group.label}
            </p>
            <span className="text-[10px] text-black/40">{group.rows.length} archivo{group.rows.length === 1 ? "" : "s"}</span>
          </div>

          <div
            data-testid={`purchase-attachment-grid-${group.key}`}
            className={`grid gap-2 p-3 ${getGridColumnsClass(group.rows.length)}`}
          >
            {group.rows.map((attachment) => (
              <div
                key={attachment.attachmentId}
                className="flex justify-between rounded-md border border-black/10 bg-white p-3 shadow-sm transition hover:border-black/20 hover:bg-slate-50/60 gap-2"
              >
                <div className="flex min-w-0 items-start gap-2">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-slate-50 text-slate-600 ring-1 ring-black/5">
                    {isImageAttachment(attachment) ? <Image className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0">
                    <button
                      type="button"
                      onClick={() => openAttachmentPreview(attachment)}
                      className="block max-w-full truncate text-left text-xs font-semibold text-black/80 hover:text-primary"
                      aria-label={`Ver ${getAttachmentName(attachment)}`}
                    >
                      {getAttachmentName(attachment)}
                    </button>
                    <p className="mt-1 text-[10px] leading-4 text-black/45">
                      {purchaseAttachmentTypeLabels[attachment.type]} · {formatSize(attachment.sizeBytes)}
                    </p>
                    <p className="text-[10px] leading-4 text-black/40">
                      {formatDate(attachment.createdAt)}
                      {attachment.paymentId ? " · pago asociado" : ""}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-center">
                  {attachment.note ? (
                    <p className="line-clamp-2 text-[10px] leading-4 text-black/40">{attachment.note}</p>
                  ) : <span />}

                  {canDelete ? (
                    <SystemButton
                      size="icon"
                      variant="danger"
                      className="h-8 w-8 shrink-0"
                      title="Eliminar documento"
                      disabled={deletingId === attachment.attachmentId}
                      onClick={() => void onDelete?.(attachment.attachmentId)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </SystemButton>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <Modal
        open={Boolean(documentPreviewAttachment)}
        onClose={() => setDocumentPreviewAttachment(null)}
        title={documentPreviewName}
        className="w-[900px]"
        bodyClassName="p-0"
      >
        {documentPreviewAttachment && documentPreviewUrl ? (
          <div className="bg-white">
            {isDocumentPreviewPdf ? (
              <iframe
                title={documentPreviewName}
                src={documentPreviewUrl}
                className="h-[75vh] w-full bg-white"
              />
            ) : (
              <div className="flex min-h-60 flex-col items-center justify-center gap-3 p-6 text-center">
                <FileText className="h-10 w-10 text-black/35" />
                <p className="text-sm font-medium text-black/70">Vista previa no disponible para este archivo.</p>
                <a
                  href={documentPreviewUrl}
                  download={documentPreviewName}
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-black/10 px-3 text-xs font-medium text-black/75 hover:bg-black/[0.03]"
                >
                  <Download className="h-4 w-4" />
                  Descargar
                </a>
              </div>
            )}
          </div>
        ) : null}
      </Modal>
      <ImagePreviewModal
        open={Boolean(imagePreviewAttachment && imagePreviewUrl)}
        images={imagePreviewUrl ? [imagePreviewUrl] : []}
        currentIndex={0}
        onClose={() => setImagePreviewAttachment(null)}
        altPrefix="Comprobante fiscal"
        downloadUrls={imagePreviewUrl ? [imagePreviewUrl] : []}
        fileNames={[imagePreviewName]}
      />
    </div>
  );
}
