import { FileText, Trash2 } from "lucide-react";
import { SystemButton } from "@/shared/components/components/SystemButton";
import {
  purchaseAttachmentTypeLabels,
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

export function PurchaseAttachmentViewer({ attachments, canDelete = false, deletingId, onDelete }: Props) {
  if (!attachments.length) {
    return (
      <div className="rounded-md bg-slate-50 px-3 py-4 text-center text-xs text-black/45">
        No hay documentos formales registrados.
      </div>
    );
  }

  const grouped = attachments.reduce<Record<string, PurchaseAttachment[]>>((acc, attachment) => {
    const key = attachment.type;
    acc[key] = [...(acc[key] ?? []), attachment];
    return acc;
  }, {});

  return (
    <div className="space-y-3">
      {Object.entries(grouped).map(([type, rows]) => (
        <div key={type} className="overflow-hidden rounded-md border border-black/5">
          <div className="flex items-center justify-between border-b border-black/5 bg-slate-50 px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-black/55">
              {purchaseAttachmentTypeLabels[type as PurchaseAttachmentType] ?? type}
            </p>
            <span className="text-[10px] text-black/40">{rows.length} archivo{rows.length === 1 ? "" : "s"}</span>
          </div>

          {rows.map((attachment) => (
            <div
              key={attachment.attachmentId}
              className="flex items-center justify-between gap-3 border-b border-black/5 px-3 py-2 last:border-b-0 hover:bg-slate-50/80"
            >
              <div className="flex min-w-0 items-center gap-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white text-slate-600 ring-1 ring-black/5">
                  <FileText className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <a
                    href={attachment.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block truncate text-xs font-medium text-black/80 hover:text-primary"
                  >
                    {attachment.originalName || attachment.filename}
                  </a>
                  <p className="mt-0.5 truncate text-[10px] text-black/40">
                    {formatSize(attachment.sizeBytes)} · {formatDate(attachment.createdAt)}
                    {attachment.paymentId ? " · pago asociado" : ""}
                  </p>
                  {attachment.note ? (
                    <p className="mt-0.5 truncate text-[10px] text-black/40">{attachment.note}</p>
                  ) : null}
                </div>
              </div>

              {canDelete ? (
                <SystemButton
                  size="icon"
                  variant="danger"
                  className="h-8 w-8"
                  title="Eliminar documento"
                  disabled={deletingId === attachment.attachmentId}
                  onClick={() => void onDelete?.(attachment.attachmentId)}
                >
                  <Trash2 className="h-4 w-4" />
                </SystemButton>
              ) : null}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

