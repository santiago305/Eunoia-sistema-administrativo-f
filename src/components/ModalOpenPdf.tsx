import { SystemButton } from "@/components/SystemButton";
import { List } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { Modal } from "./modales/Modal";

type PdfViewerModalProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  getPdf: () => Promise<Blob>;
  primaryColor?: string;
  footer?: ReactNode;
  className?: string;
  iframeTitle?: string;
  reloadKey?: string | number | boolean | null;
  loadWhen?: boolean;
};

const DEFAULT_PRIMARY = "hsl(var(--primary))";
const DEFAULT_CLASSNAME = "w-[800px]";

export function PdfViewerModal({
  open,
  onClose,
  title = "Documento",
  getPdf,
  primaryColor,
  footer,
  className,
  iframeTitle,
  reloadKey = null,
  loadWhen = true,
}: PdfViewerModalProps) {
  const accent = primaryColor ?? DEFAULT_PRIMARY;
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const getPdfRef = useRef(getPdf);

  useEffect(() => {
    getPdfRef.current = getPdf;
  }, [getPdf]);

  useEffect(() => {
    if (!open || !loadWhen) {
      setPdfUrl(null);
      setError(null);
      setLoading(false);
      return;
    }

    let alive = true;
    let objectUrl: string | null = null;

    const loadPdf = async () => {
      setLoading(true);
      setError(null);
      setPdfUrl(null);

      try {
        const blob = await getPdfRef.current();
        if (!alive) return;
        objectUrl = URL.createObjectURL(blob);
        setPdfUrl(objectUrl);
      } catch {
        if (!alive) return;
        setError("No se pudo cargar el PDF.");
      } finally {
        if (alive) setLoading(false);
      }
    };

    void loadPdf();

    return () => {
      alive = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [loadWhen, open, reloadKey]);

  if (!open) return null;

  const resolvedClassName = [DEFAULT_CLASSNAME, className].filter(Boolean).join(" ");

  return (
    <Modal title={title} className={resolvedClassName} open={open} onClose={onClose}>
      <div className="space-y-6">
        <div className="rounded-2xl border border-black/10 overflow-hidden bg-white">
          {loading && (
            <div className="flex h-[70vh] items-center justify-center text-sm text-black/60">
              Cargando PDF...
            </div>
          )}

          {!loading && error && (
            <div className="flex h-[70vh] items-center justify-center text-sm text-rose-600">
              {error}
            </div>
          )}

          {!loading && !error && pdfUrl && (
            <iframe
              title={iframeTitle ?? title}
              src={pdfUrl}
              className="h-[75vh] w-full overflow-auto"
            />
          )}

          {!loading && !error && !pdfUrl && (
            <div className="flex h-[70vh] items-center justify-center text-sm text-black/60">
              No hay PDF disponible.
            </div>
          )}
        </div>

        {footer ?? (
          <div className="flex">
            <SystemButton
              leftIcon={<List className="h-4 w-4" />}
              className="ms-auto"
              style={{
                backgroundColor: accent,
                borderColor: `color-mix(in srgb, ${accent} 20%, transparent)`,
              }}
              onClick={onClose}
            >
              Cerrar
            </SystemButton>
          </div>
        )}
      </div>
    </Modal>
  );
}
