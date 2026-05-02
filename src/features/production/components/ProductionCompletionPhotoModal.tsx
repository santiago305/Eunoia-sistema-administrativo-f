import { CompletionPhotoModal } from "@/shared/components/modales/CompletionPhotoModal";

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
  return (
    <CompletionPhotoModal
      open={open}
      loading={loading}
      onClose={onClose}
      onConfirm={onConfirm}
      onCancelWithoutPhoto={onCancelWithoutPhoto}
      title="Produccion completada"
      heading="Tu produccion ya termino"
      description="Sube una foto de la produccion para dejar evidencia del registro."
      previewAlt="Vista previa de la produccion"
    />
  );
}
