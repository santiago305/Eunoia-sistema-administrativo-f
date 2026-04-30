import { useEffect } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

type ImagePreviewModalProps = {
  open: boolean;
  images: string[];
  currentIndex: number;
  onClose: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  altPrefix?: string;
};

export function ImagePreviewModal({
  open,
  images,
  currentIndex,
  onClose,
  onPrevious,
  onNext,
  altPrefix = "Imagen",
}: ImagePreviewModalProps) {
  const currentImage = images[currentIndex];
  const hasMultipleImages = images.length > 1;

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft") onPrevious?.();
      if (event.key === "ArrowRight") onNext?.();
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose, onNext, onPrevious]);

  if (!open || !currentImage) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 px-4 py-6"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-black/70 shadow-lg transition hover:bg-white hover:text-black"
        aria-label="Cerrar imagen"
      >
        <X className="h-5 w-5" />
      </button>

      {hasMultipleImages ? (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onPrevious?.();
          }}
          className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-black/70 shadow-lg transition hover:bg-white hover:text-black"
          aria-label="Imagen anterior"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
      ) : null}

      <div
        className="flex max-h-[90vh] max-w-[92vw] flex-col items-center gap-3"
        onClick={(event) => event.stopPropagation()}
      >
        <img
          src={currentImage}
          alt={`${altPrefix} ${currentIndex + 1}`}
          className="max-h-[82vh] max-w-full rounded-lg object-contain shadow-2xl"
        />

        {hasMultipleImages ? (
          <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-black/65">
            {currentIndex + 1} / {images.length}
          </span>
        ) : null}
      </div>

      {hasMultipleImages ? (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onNext?.();
          }}
          className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-black/70 shadow-lg transition hover:bg-white hover:text-black"
          aria-label="Imagen siguiente"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      ) : null}
    </div>
  );
}
