import { CompletionPhotoModal } from "@/shared/components/modales/CompletionPhotoModal";

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
  return (
    <CompletionPhotoModal
      open={open}
      loading={loading}
      onClose={onClose}
      onConfirm={onConfirm}
      onCancelWithoutPhoto={onCancelWithoutPhoto}
      title="Compra completada"
      heading="Tu compra ya se realizo"
      description="Sube una foto de la compra para dejar evidencia del registro."
      previewAlt="Vista previa de la compra"
    />
  );
}
