import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Download, X } from "lucide-react";

type ImagePreviewModalProps = {
  open: boolean;
  images: string[];
  currentIndex: number;
  onClose: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  altPrefix?: string;
  downloadUrls?: string[];
  fileNames?: string[];
};

export function ImagePreviewModal({
  open,
  images,
  currentIndex,
  onClose,
  onPrevious,
  onNext,
  altPrefix = "Imagen",
  downloadUrls,
  fileNames,
}: ImagePreviewModalProps) {
  const currentImage = images[currentIndex];
  const currentDownloadUrl = downloadUrls?.[currentIndex] ?? currentImage;
  const currentFileName = fileNames?.[currentIndex] ?? `${altPrefix}-${currentIndex + 1}`;
  const hasMultipleImages = images.length > 1;
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const previousFocusedElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    previousFocusedElementRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const focusableSelector = [
      "button:not([disabled])",
      "a[href]",
      "input:not([disabled])",
      "select:not([disabled])",
      "textarea:not([disabled])",
      "[tabindex]:not([tabindex='-1'])",
    ].join(", ");

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        onClose();
      }
      if (event.key === "Tab") {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        const dialog = dialogRef.current;
        if (!dialog) return;
        const focusableElements = Array.from(
          dialog.querySelectorAll<HTMLElement>(focusableSelector),
        ).filter((element) => !element.hasAttribute("disabled"));
        if (focusableElements.length === 0) {
          dialog.focus();
          return;
        }

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        const activeElement = document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
        const activeIndex = activeElement ? focusableElements.indexOf(activeElement) : -1;
        if (event.shiftKey) {
          if (activeIndex <= 0) {
            lastElement.focus();
          } else {
            focusableElements[activeIndex - 1].focus();
          }
        } else if (activeIndex < 0 || activeIndex === focusableElements.length - 1) {
          firstElement.focus();
        } else {
          focusableElements[activeIndex + 1].focus();
        }
      }
      if (event.key === "ArrowLeft" && onPrevious) {
        event.preventDefault();
        event.stopPropagation();
        onPrevious();
      }
      if (event.key === "ArrowRight" && onNext) {
        event.preventDefault();
        event.stopPropagation();
        onNext();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown, true);
    requestAnimationFrame(() => closeButtonRef.current?.focus());

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown, true);
      const previousFocusedElement = previousFocusedElementRef.current;
      if (previousFocusedElement?.isConnected) {
        requestAnimationFrame(() => previousFocusedElement.focus());
      }
    };
  }, [open, onClose, onNext, onPrevious]);

  if (!open || !currentImage) return null;

  const modalContent = (
    <div
      ref={dialogRef}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 px-4 py-6"
      role="dialog"
      aria-modal="true"
      aria-label={`${altPrefix} en tamaño completo`}
      tabIndex={-1}
      onClick={onClose}
    >
      <button
        ref={closeButtonRef}
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-black/70 shadow-lg transition hover:bg-white hover:text-black"
        aria-label="Cerrar imagen"
      >
        <X className="h-5 w-5" />
      </button>

      {currentDownloadUrl ? (
        <a
          href={currentDownloadUrl}
          download={currentFileName}
          onClick={(event) => event.stopPropagation()}
          className="absolute right-16 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-black/70 shadow-lg transition hover:bg-white hover:text-black"
          aria-label="Descargar imagen"
        >
          <Download className="h-5 w-5" />
        </a>
      ) : null}

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

  if (typeof document === "undefined") return null;
  return createPortal(modalContent, document.body);
}
