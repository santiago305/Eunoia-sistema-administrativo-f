import { useState } from "react";
import { Modal } from "@/shared/components/modales/Modal";
import { SystemButton } from "@/shared/components/components/SystemButton";

type Props = {
  open: boolean;
  loading?: boolean;
  onClose: () => void;
  onConfirm: (file: File) => Promise<void> | void;
  onCancelWithoutPhoto: () => Promise<void> | void;
};

export function ProductionCompletionPhotoModal({
  open,
  loading = false,
  onClose,
  onConfirm,
  onCancelWithoutPhoto,
}: Props) {
  const [file, setFile] = useState<File | null>(null);

  return (
    <Modal open={open} onClose={onClose} title="Producción completada" className="w-[380px]">
      <div className="space-y-3 text-xs">
        <p className="text-black/60">Tu producción ya terminó. Sube una foto de la producción.</p>
        <label className="space-y-1 block">
          <span className="text-[10px] text-black/45">Foto de producción</span>
          <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="w-full rounded-md border border-black/10 px-2 py-1.5" />
        </label>
        <div className="flex justify-end gap-2">
          <SystemButton variant="ghost" onClick={() => onCancelWithoutPhoto()} disabled={loading}>
            Cancelar
          </SystemButton>
          <SystemButton onClick={() => file && onConfirm(file)} disabled={!file || loading}>
            Aceptar
          </SystemButton>
        </div>
      </div>
    </Modal>
  );
}
