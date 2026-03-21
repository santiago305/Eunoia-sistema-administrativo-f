import { Modal } from "@/components/settings/modal";
import { getProductionOrderPdf } from "@/services/pdfServices";
import { useEffect, useState } from "react";

type ModalNavigateProductionProps = {
  open: boolean;
  onClose: () => void;
  onNewProduction: () => void;
  onGoToList: () => void;
  productionId?: string;
  primaryColor?: string;
};

const DEFAULT_PRIMARY = "hsl(var(--primary))";

export function ModalNavigateProduction({
  open,
  onClose,
  onNewProduction,
  onGoToList,
  productionId,
  primaryColor,
}: ModalNavigateProductionProps) {
  const accent = primaryColor ?? DEFAULT_PRIMARY;
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log("[production-modal] open", open, "productionId", productionId);
    if (!open || !productionId) {
      setPdfUrl(null);
      setError(null);
      setLoading(false);
      return;
    }

    let alive = true;
    let objectUrl: string | null = null;

    const loadPdf = async () => {
      console.log("[production-modal] loading pdf for", productionId);
      setLoading(true);
      setError(null);
      setPdfUrl(null);
      try {
        const blob = await getProductionOrderPdf(productionId);
        console.log("[production-modal] pdf blob", blob);
        if (!alive) return;
        objectUrl = URL.createObjectURL(blob);
        setPdfUrl(objectUrl);
      } catch {
        console.error("[production-modal] error fetching pdf");
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
  }, [open, productionId]);

  if (!open) return null;

  return (
    <Modal title="Produccion procesada" className="max-w-5xl h-[95vh]">
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
              <iframe
                title={`orden-produccion-${productionId}`}
                src={pdfUrl}
                className="h-[74vh] w-full overflow-auto"
              />
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
              onClick={onNewProduction}
            >
              Ingresar nueva orden
            </button>
            <button
              type="button"
              className="flex-1 rounded-xl border px-4 py-2 text-sm text-white"
              style={{ backgroundColor: accent, borderColor: `color-mix(in srgb, ${accent} 20%, transparent)` }}
              onClick={onGoToList}
            >
              Ir a listado de produccion
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
