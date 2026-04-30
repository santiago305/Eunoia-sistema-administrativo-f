import { useEffect, useState } from "react";
import { ImagePlus, Trash2 } from "lucide-react";

import { Modal } from "@/shared/components/modales/Modal";
import { SystemButton } from "@/shared/components/components/SystemButton";

type Props = {
  open: boolean;
  loading?: boolean;
  onClose: () => void;
  onConfirm: (file: File) => Promise<void> | void;
  onCancelWithoutPhoto: () => Promise<void> | void;
};

export function PurchaseCompletionPhotoModal({
  open,
  loading = false,
  onClose,
  onConfirm,
  onCancelWithoutPhoto,
}: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [inputKey, setInputKey] = useState(0);

  const resetPhoto = () => {
    setFile(null);
    setPreviewUrl(null);
    setInputKey((prev) => prev + 1);
  };

  useEffect(() => {
    if (!open) resetPhoto();
  }, [open]);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    return () => URL.revokeObjectURL(url);
  }, [file]);

  const handleClose = () => {
    if (loading) return;
    resetPhoto();
    onClose();
  };

  const handleCancelWithoutPhoto = async () => {
    if (loading) return;

    await onCancelWithoutPhoto();
    resetPhoto();
  };

  const handleConfirm = async () => {
    if (!file || loading) return;

    await onConfirm(file);
    resetPhoto();
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Compra completada"
      className="w-[420px]"
    >
      <div className="space-y-4 text-xs">
        <div className="space-y-1">
          <p className="text-sm font-medium text-black/80">
            Tu compra ya se realizó
          </p>

          <p className="text-black/55">
            Sube una foto de la compra para dejar evidencia del registro.
          </p>
        </div>

        <label
          className={[
            "flex min-h-[170px] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-black/15 bg-black/[0.02] p-3 text-center transition",
            "hover:border-black/30 hover:bg-black/[0.04]",
            loading ? "pointer-events-none opacity-60" : "",
          ].join(" ")}
        >
          {previewUrl ? (
            <div className="relative w-full">
              <img
                src={previewUrl}
                alt="Vista previa de la compra"
                className="max-h-[220px] w-full rounded-lg object-contain"
              />
            </div>
          ) : (
            <>
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-black/[0.06] text-black/55">
                <ImagePlus className="h-5 w-5" />
              </div>

              <div className="space-y-1">
                <p className="font-medium text-black/70">
                  Selecciona una imagen
                </p>

                <p className="text-[11px] text-black/45">
                  Puedes subir JPG, PNG o una foto tomada desde tu dispositivo.
                </p>
              </div>
            </>
          )}

          <input
            key={inputKey}
            type="file"
            accept="image/*"
            disabled={loading}
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            className="hidden"
          />
        </label>

        {file ? (
          <div className="flex items-center justify-between rounded-lg bg-black/[0.03] px-3 py-2">
            <div className="min-w-0">
              <p className="truncate text-[11px] font-medium text-black/70">
                {file.name}
              </p>

              <p className="text-[10px] text-black/40">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>

            <button
              type="button"
              onClick={resetPhoto}
              disabled={loading}
              className="flex h-8 w-8 items-center justify-center rounded-full text-red-500 transition hover:bg-red-50 disabled:opacity-50"
              aria-label="Quitar foto"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ) : null}

        <div className="flex justify-end gap-2 pt-1">
          <SystemButton
            variant="ghost"
            onClick={() => void handleCancelWithoutPhoto()}
            disabled={loading}
          >
            Continuar sin foto
          </SystemButton>

          <SystemButton
            onClick={() => void handleConfirm()}
            disabled={!file || loading}
          >
            {loading ? "Guardando..." : "Aceptar"}
          </SystemButton>
        </div>
      </div>
    </Modal>
  );
}