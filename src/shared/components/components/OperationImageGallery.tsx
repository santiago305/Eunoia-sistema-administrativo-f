import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { env } from "@/env";
import { ImagePreviewModal } from "@/shared/components/components/ImagePreviewModal";

type Props = {
  images?: string[];
  altPrefix?: string;
  emptyMessage?: string;
  canUpload?: boolean;
  uploading?: boolean;
  onUpload?: (file?: File | null) => Promise<void> | void;
};

const resolveImageUrl = (rawUrl?: string | null) => {
  const raw = rawUrl?.trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  try {
    return new URL(raw, env.apiBaseUrl).toString();
  } catch {
    return raw;
  }
};

export function OperationImageGallery({
  images = [],
  altPrefix = "Imagen",
  emptyMessage = "No hay imagen.",
  canUpload = false,
  uploading = false,
  onUpload,
}: Props) {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [previewImageIndex, setPreviewImageIndex] = useState<number | null>(null);

  const normalizedImages = useMemo(
    () => images.map((url) => resolveImageUrl(url)).filter(Boolean),
    [images],
  );

  const hasMultipleImages = normalizedImages.length > 1;
  const activeImage = normalizedImages[activeImageIndex] ?? normalizedImages[0];

  useEffect(() => {
    setActiveImageIndex(0);
    setPreviewImageIndex(null);
  }, [images.length]);

  if (!normalizedImages.length) {
    return (
      <div className="space-y-2">
        <div className="rounded-md bg-slate-50 px-3 py-4 text-center text-xs text-black/45">
          {emptyMessage}
        </div>
        {canUpload ? (
          <label className="block text-xs text-black/60">
            <span className="mb-1 block">Subir foto (solo admin)</span>
            <input
              type="file"
              accept="image/*"
              disabled={uploading}
              onChange={(e) => void onUpload?.(e.target.files?.[0] ?? null)}
              className="w-full rounded-md border border-black/10 px-2 py-1.5"
            />
          </label>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="relative h-35 w-full overflow-hidden rounded-md border border-black/10 bg-slate-50">
        <button
          type="button"
          onClick={() => setPreviewImageIndex(activeImageIndex)}
          className="block h-full w-full"
          aria-label="Ver imagen grande"
        >
          <img
            src={activeImage}
            alt={`${altPrefix} ${activeImageIndex + 1}`}
            className="h-full w-full object-cover"
          />
        </button>

        {hasMultipleImages ? (
          <>
            <button
              type="button"
              onClick={() =>
                setActiveImageIndex((current) =>
                  current === 0 ? normalizedImages.length - 1 : current - 1,
                )
              }
              className="absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-black/65 shadow transition hover:bg-white hover:text-black"
              aria-label="Imagen anterior"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            <button
              type="button"
              onClick={() =>
                setActiveImageIndex((current) =>
                  current === normalizedImages.length - 1 ? 0 : current + 1,
                )
              }
              className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-black/65 shadow transition hover:bg-white hover:text-black"
              aria-label="Imagen siguiente"
            >
              <ChevronRight className="h-5 w-5" />
            </button>

            <span className="absolute bottom-2 right-2 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-medium text-black/55">
              {activeImageIndex + 1} / {normalizedImages.length}
            </span>
          </>
        ) : null}
      </div>

      {hasMultipleImages ? (
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {normalizedImages.map((url, index) => (
            <button
              key={`${url}-${index}`}
              type="button"
              onClick={() => setActiveImageIndex(index)}
              className={`h-12 w-14 shrink-0 overflow-hidden rounded-md border transition ${
                activeImageIndex === index
                  ? "border-black/45"
                  : "border-black/10 opacity-70 hover:opacity-100"
              }`}
              aria-label={`Seleccionar imagen ${index + 1}`}
            >
              <img
                src={url}
                alt={`${altPrefix} miniatura ${index + 1}`}
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      ) : null}

      <ImagePreviewModal
        open={previewImageIndex !== null}
        images={normalizedImages}
        currentIndex={previewImageIndex ?? 0}
        onClose={() => setPreviewImageIndex(null)}
        onPrevious={() =>
          setPreviewImageIndex((currentIndex) => {
            if (currentIndex === null) return 0;
            return currentIndex === 0 ? normalizedImages.length - 1 : currentIndex - 1;
          })
        }
        onNext={() =>
          setPreviewImageIndex((currentIndex) => {
            if (currentIndex === null) return 0;
            return currentIndex === normalizedImages.length - 1 ? 0 : currentIndex + 1;
          })
        }
        altPrefix={altPrefix}
      />
    </div>
  );
}
