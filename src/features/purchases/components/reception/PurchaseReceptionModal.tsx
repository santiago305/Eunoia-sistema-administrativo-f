import { X } from "lucide-react";
import type { ReactNode } from "react";
import { SystemButton } from "@/shared/components/components/SystemButton";

type Props = {
  open: boolean;
  title: string;
  children: ReactNode;
  loading?: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function PurchaseReceptionModal({ open, title, children, loading, onClose, onConfirm }: Props) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
      <div className="max-h-[90dvh] w-full max-w-5xl overflow-hidden rounded-sm bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-black/10 px-4 py-3">
          <h2 className="text-sm font-semibold text-black">{title}</h2>
          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded-sm text-black/60 hover:bg-black/[0.04]"
            onClick={onClose}
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[calc(90dvh-120px)] overflow-auto p-4">{children}</div>
        <div className="flex justify-end gap-2 border-t border-black/10 p-3">
          <SystemButton variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </SystemButton>
          <SystemButton onClick={onConfirm} disabled={loading}>
            {loading ? "Confirmando..." : "Confirmar recepción"}
          </SystemButton>
        </div>
      </div>
    </div>
  );
}
