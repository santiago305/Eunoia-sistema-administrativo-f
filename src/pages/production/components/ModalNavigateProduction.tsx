import { Modal } from "@/components/modales/Modal";
import { SystemButton } from "@/components/SystemButton";
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
    if (!open || !productionId) {
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
        const blob = await getProductionOrderPdf(productionId);
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
  }, [open, productionId]);

  if (!open) return null;

  return (
    <Modal open={open} title="Produccion procesada" className="w-[800px] max-h-[800px] h-[93vh]" onClose={onClose}>
      <div className="space-y-4">
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
          <SystemButton variant="outline" onClick={onNewProduction} className="flex-1">
            Ingresar nueva orden
          </SystemButton>

          <SystemButton
            onClick={onGoToList}
            className="flex-1"
            style={{
              backgroundColor: accent,
              borderColor: `color-mix(in srgb, ${accent} 20%, transparent)`,
            }}
          >
            Ir a listado de produccion
          </SystemButton>
        </div>
      </div>
    </Modal>
  );
}