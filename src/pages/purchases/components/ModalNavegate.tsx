import { Modal } from "@/components/settings/modal";
import { SystemButton } from "@/components/SystemButton";
import { getPurchaseOrderPdf } from "@/services/pdfServices";
import { Plus, List } from "lucide-react";
import { useEffect, useState } from "react";

type ModalNavegateProps = {
  open: boolean;
  onClose: () => void;
  onNewPurchase: () => void;
  onGoToList: () => void;
  poId?: string;
  primaryColor?: string;
  isEdit?: boolean;
};

const DEFAULT_PRIMARY = "hsl(var(--primary))";

export function ModalNavegate({
  open,
  onNewPurchase,
  onGoToList,
  poId,
  primaryColor,
  isEdit,
}: ModalNavegateProps) {
  const accent = primaryColor ?? DEFAULT_PRIMARY;
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !poId) {
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
        const blob = await getPurchaseOrderPdf(poId);
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
  }, [open, poId]);

  if (!open) return null;

  return (
    <Modal title="Compra procesada" className="max-w-5xl h-[95vh]">
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
              <iframe title={`orden-compra-${poId}`} src={pdfUrl} className="h-[74vh] w-full overflow-auto" />
            )}
            {!loading && !error && !pdfUrl && (
              <div className="flex h-[60vh] items-center justify-center text-sm text-black/60">
                No hay PDF disponible.
              </div>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <SystemButton
              leftIcon={<Plus className="h-4 w-4" />}
              variant="ghost"
              className="flex-1 bg-gray-200"
              onClick={onNewPurchase}
            >
              Ingresar nueva compra
            </SystemButton>

            <SystemButton
              leftIcon={<List className="h-4 w-4" />}
              className="flex-1"
              style={{
                backgroundColor: accent,
                borderColor: `color-mix(in srgb, ${accent} 20%, transparent)`,
              }}
              onClick={onGoToList}
            >
              Ir a listado de compras
            </SystemButton>
          </div>
        </div>
      </div>
    </Modal>
  );
}
