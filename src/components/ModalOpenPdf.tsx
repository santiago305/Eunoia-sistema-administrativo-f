import { Modal } from "@/components/settings/modal";
import { SystemButton } from "@/components/SystemButton";
import { List } from "lucide-react";
import { useEffect, useState } from "react";

type PdfViewerModalProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  getPdf: () => Promise<Blob>; // <- aquí pasas el método
  primaryColor?: string;
};

const DEFAULT_PRIMARY = "hsl(var(--primary))";

export function PdfViewerModal({
  open,
  onClose,
  title = "Documento",
  getPdf,
  primaryColor,
}: PdfViewerModalProps) {
  const accent = primaryColor ?? DEFAULT_PRIMARY;
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
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
        const blob = await getPdf();
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
  }, [open, getPdf]);

  if (!open) return null;

  return (
    <Modal title={title} className="max-w-5xl h-[95vh]">
      <div className="space-y-3">
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
              title="pdf-viewer"
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
      </div>
    </Modal>
  );
}