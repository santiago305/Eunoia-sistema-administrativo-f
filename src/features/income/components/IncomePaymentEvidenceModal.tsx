import { useEffect, useMemo, useState } from "react";
import { ImagePlus, UploadCloud, X } from "lucide-react";
import { Modal } from "@/shared/components/modales/Modal";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { OperationImageGallery } from "@/shared/components/components/OperationImageGallery";
import { errorResponse, successResponse } from "@/shared/common/utils/response";
import { parseApiError } from "@/shared/common/utils/handleApiError";
import { useFeedbackToast } from "@/shared/hooks/useFeedbackToast";
import { getIncomeEvidence, uploadIncomeEvidence } from "@/shared/services/incomeService";
import type { Income, IncomeEvidenceSummary } from "../types/income.types";

type Props = {
  open: boolean;
  income: Income | null;
  canViewEvidence: boolean;
  canAttachEvidence: boolean;
  onClose: () => void;
  onUploaded?: () => void | Promise<void>;
};

const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function IncomePaymentEvidenceModal({ open, income, canViewEvidence, canAttachEvidence, onClose, onUploaded }: Props) {
  const [evidence, setEvidence] = useState<IncomeEvidenceSummary | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [selectedPreviewUrl, setSelectedPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { showFeedback } = useFeedbackToast();
  const rowHasEvidence = Boolean(income?.evidence?.available || income?.evidence?.status === "AVAILABLE" || income?.evidence?.url || income?.evidenceUrl);
  const canUpload = Boolean(canAttachEvidence && income?.status === "POSTED" && !evidence?.available && !evidence?.url && !rowHasEvidence);

  const load = async () => {
    if (!open || !income || !canViewEvidence) { setEvidence(null); return; }
    setLoading(true);
    try { setEvidence(await getIncomeEvidence(income.incomeId)); }
    catch { setEvidence(null); showFeedback(errorResponse("No se pudo cargar la evidencia del ingreso.")); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (open) { setFile(null); void load(); } }, [open, income?.incomeId, canViewEvidence]);
  useEffect(() => {
    if (!file) { setSelectedPreviewUrl(null); return; }
    if (typeof URL.createObjectURL !== "function") { setSelectedPreviewUrl(null); return; }
    const url = URL.createObjectURL(file);
    setSelectedPreviewUrl(url);
    return () => { if (typeof URL.revokeObjectURL === "function") URL.revokeObjectURL(url); };
  }, [file]);

  const imageUrls = useMemo(() => selectedPreviewUrl ? [selectedPreviewUrl] : evidence?.url ? [evidence.url] : [], [evidence?.url, selectedPreviewUrl]);
  const statusLabel = income?.status === "VOIDED" ? "Anulado" : "Contabilizado";
  const methodLabel = income?.paymentMethodName || income?.method || "Sin método";
  const amountLabel = income ? new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(income.amount || 0) : "—";
  const dateLabel = income ? new Intl.DateTimeFormat("es-PE", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(income.date)) : "—";

  const setSelectedFile = (candidate?: File | null) => {
    if (!candidate) return;
    if (!ACCEPTED_TYPES.includes(candidate.type)) {
      showFeedback(errorResponse("Solo se permiten imágenes JPG, PNG o WEBP."));
      return;
    }
    if (candidate.size > MAX_IMAGE_BYTES) {
      showFeedback(errorResponse("La imagen supera el límite de 15 MB."));
      return;
    }
    setFile(candidate);
  };

  const handleUpload = async () => {
    if (!file || !income || !canUpload || uploading) return;
    setUploading(true);
    try {
      await uploadIncomeEvidence(income.incomeId, file);
      setFile(null);
      showFeedback(successResponse("Evidencia subida correctamente."));
      await load();
      await onUploaded?.();
    } catch (error) { showFeedback(errorResponse(parseApiError(error, "No se pudo subir la evidencia."))); }
    finally { setUploading(false); }
  };

  const canSelectEvidence = canAttachEvidence && !rowHasEvidence && income?.status === "POSTED";

  return <Modal open={open} onClose={onClose} title="Evidencia del ingreso" description={income ? `${income.saleOrderNumber} · ${income.clientName}` : undefined} className="w-full max-w-2xl" preventClose={uploading} footer={<div className="flex justify-end gap-2"><SystemButton variant="ghost" onClick={onClose} disabled={uploading}>Cerrar</SystemButton>{canAttachEvidence ? <SystemButton leftIcon={<UploadCloud className="h-4 w-4" />} onClick={() => void handleUpload()} disabled={!file || !canUpload} loading={uploading}>Subir evidencia</SystemButton> : null}</div>}>
    <div className="space-y-4">
      {income ? <div className="grid grid-cols-2 gap-2 rounded-lg border border-border bg-muted/20 p-3 text-xs sm:grid-cols-4"><div><span className="block text-muted-foreground">Monto</span><strong className="text-foreground">{amountLabel}</strong></div><div><span className="block text-muted-foreground">Fecha</span><strong className="text-foreground">{dateLabel}</strong></div><div><span className="block text-muted-foreground">Método</span><strong className="block truncate text-foreground" title={methodLabel}>{methodLabel}</strong></div><div><span className="block text-muted-foreground">Estado</span><strong className={income.status === "VOIDED" ? "text-red-700" : "text-emerald-700"}>{statusLabel}</strong></div></div> : null}
      {!canViewEvidence && !file ? <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm text-muted-foreground">No tienes permiso para ver la evidencia existente.</div> : loading ? <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">Cargando evidencia...</div> : <OperationImageGallery images={imageUrls} altPrefix="Evidencia de ingreso" emptyMessage="Este ingreso no tiene evidencia." canUpload={false} />}
      {canSelectEvidence ? <div className="space-y-2"><label onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); setSelectedFile(event.dataTransfer.files?.[0]); }} className="flex min-h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 px-3 py-4 text-center text-xs text-muted-foreground transition hover:border-primary/50 hover:bg-primary/5"><input aria-label="Seleccionar evidencia" type="file" className="sr-only" accept={ACCEPTED_TYPES.join(",")} disabled={!canUpload || uploading} onChange={(event) => setSelectedFile(event.target.files?.[0])} /><ImagePlus className="h-5 w-5" /><span className="font-semibold text-foreground">Agregar evidencia</span><span>Selecciona o arrastra JPG, PNG o WEBP · máximo 15 MB</span></label>{file ? <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2 text-xs"><span className="min-w-0 truncate">{file.name}</span><SystemButton type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => setFile(null)}><X className="h-4 w-4" /></SystemButton></div> : null}</div> : null}
    </div>
  </Modal>;
}
