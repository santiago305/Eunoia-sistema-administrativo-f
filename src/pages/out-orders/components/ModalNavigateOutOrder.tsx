import { Modal } from "@/components/settings/modal";
import { getDocumentInventoryPdf } from "@/services/pdfServices";
import { useEffect, useState } from "react";

type ModalNavigateOutOrderProps = {
  open: boolean;
  onClose: () => void;
  onNewOutOrder: () => void;
  onGoToList: () => void;
  outOrderId?: string;
  primaryColor?: string;
};

const DEFAULT_PRIMARY = "hsl(var(--primary))";

export function ModalNavigateOutOrder({
  open,
  onClose,
  onNewOutOrder,
  onGoToList,
  outOrderId,
  primaryColor,
}: ModalNavigateOutOrderProps) {
  const accent = primaryColor ?? DEFAULT_PRIMARY;
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !outOrderId) {
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
        const blob = await getDocumentInventoryPdf(outOrderId);
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
  }, [open, outOrderId]);

  if (!open) return null;

  return (
    <Modal title="Documento de inventario procesado" className="max-w-5xl h-[95vh]">
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="rounded-2xl border border-black/10 overflow-hidden bg-white">
            {loading && (
              <div className="flex h-[60vh] items-center justify-center text-sm text-black/60">
                Cargando PDF...
              </div>
            )}
            {!loading && error && (
              <div className="flex h-[60vh] items-center justify-center text-sm text-rose-600">
                {error}
              </div>
            )}
            {!loading && !error && pdfUrl && (
              <iframe title={`documento-inventario-${outOrderId}`} src={pdfUrl} className="h-[74vh] w-full overflow-auto" />
            )}
            {!loading && !error && !pdfUrl && (
              <div className="flex h-[60vh] items-center justify-center text-sm text-black/60">
                No hay PDF disponible.
              </div>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              className="flex-1 rounded-xl border border-black/10 bg-white px-4 py-2 text-sm hover:bg-black/[0.03]"
              onClick={onNewOutOrder}
            >
              Ingresar nueva salida
            </button>
            <button
              type="button"
              className="flex-1 rounded-xl border px-4 py-2 text-sm text-white"
              style={{ backgroundColor: accent, borderColor: `color-mix(in srgb, ${accent} 20%, transparent)` }}
              onClick={onGoToList}
            >
              Ir a kardex de productos terminados
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
