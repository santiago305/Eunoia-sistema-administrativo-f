import { Modal } from "@/components/settings/modal";

type ModalNavigateProductionProps = {
  open: boolean;
  onClose: () => void;
  onNewProduction: () => void;
  onGoToList: () => void;
  primaryColor?: string;
};

const DEFAULT_PRIMARY = "#21b8a6";

export function ModalNavigateProduction({
  open,
  onClose,
  onNewProduction,
  onGoToList,
  primaryColor,
}: ModalNavigateProductionProps) {
  if (!open) return null;

  const accent = primaryColor ?? DEFAULT_PRIMARY;

  return (
    <Modal title="Producción procesada" className="max-w-lg" closeOnBackdrop={false} onClose={onClose}>
      <div className="space-y-6">
        <div className="text-center">
          <p className="text-2xl sm:text-3xl font-semibold text-black">
            ¡Orden de producción ha sido procesada con exito!
          </p>
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
            style={{ backgroundColor: accent, borderColor: `${accent}33` }}
            onClick={onGoToList}
          >
            Ir a listado de producción
          </button>
        </div>
      </div>
    </Modal>
  );
}
