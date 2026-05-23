import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  Download,
  FileArchive,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileType2,
  Trash2,
} from "lucide-react";
import type { MailFileItem } from "@/features/mail/types/message.types";
import { downloadAttachmentBlobUrl } from "@/features/mail/services/messages.service";
import { buildMailAttachmentDownloadUrl, formatMailAttachmentSize } from "@/features/mail/utils/mail-attachments.utils";
import { ImagePreviewModal } from "@/shared/components/components/ImagePreviewModal";
import { AlertModal } from "@/shared/components/components/AlertModal";
import { cn } from "@/shared/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/shared/components/ui/tooltip";

type Props = {
  files: MailFileItem[];
  total: number;
  loading: boolean;
  error: string | null;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onSelectVisible: (ids: string[]) => void;
  onClearSelection: () => void;
  onDeleteSelected: (ids: string[]) => Promise<void> | void;
  onDeleteOne: (id: string) => Promise<void> | void;
};

type ContextMenuState = {
  x: number;
  y: number;
  itemId: string;
} | null;

const isImageLikeAttachment = (item: Pick<MailFileItem, "mimeType" | "attachmentKind">) =>
  String(item.mimeType ?? "").toLowerCase().startsWith("image/") || item.attachmentKind === "image";

const getExtension = (name: string) => {
  const parts = String(name ?? "").split(".");
  if (parts.length < 2) return "";
  return parts.pop()!.toLowerCase();
};

const getFileVisual = (item: MailFileItem) => {
  if (isImageLikeAttachment(item)) {
    return {
      Icon: FileImage,
      iconClassName: "text-violet-600",
      surfaceClassName: "border-violet-200 bg-violet-50",
      tagClassName: "bg-violet-100 text-violet-700",
    };
  }

  const ext = getExtension(item.name);
  if (ext === "pdf") {
    return {
      Icon: FileType2,
      iconClassName: "text-rose-600",
      surfaceClassName: "border-rose-200 bg-rose-50",
      tagClassName: "bg-rose-100 text-rose-700",
    };
  }
  if (["xls", "xlsx", "csv"].includes(ext)) {
    return {
      Icon: FileSpreadsheet,
      iconClassName: "text-emerald-600",
      surfaceClassName: "border-emerald-200 bg-emerald-50",
      tagClassName: "bg-emerald-100 text-emerald-700",
    };
  }
  if (["zip", "rar", "7z"].includes(ext)) {
    return {
      Icon: FileArchive,
      iconClassName: "text-amber-600",
      surfaceClassName: "border-amber-200 bg-amber-50",
      tagClassName: "bg-amber-100 text-amber-700",
    };
  }

  return {
    Icon: FileText,
    iconClassName: "text-sky-600",
    surfaceClassName: "border-sky-200 bg-sky-50",
    tagClassName: "bg-sky-100 text-sky-700",
  };
};

export default function MailFilesView({
  files,
  total,
  loading,
  error,
  selectedIds,
  onToggleSelect,
  onSelectVisible,
  onClearSelection,
  onDeleteSelected,
  onDeleteOne,
}: Props) {
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([]);
  const [deleting, setDeleting] = useState(false);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<Record<string, string>>({});

  const imageFiles = useMemo(
    () => files.filter((item) => isImageLikeAttachment(item)),
    [files],
  );
  const selected = Array.from(selectedIds);
  const allVisibleSelected = files.length > 0 && files.every((file) => selectedIds.has(file.id));

  const previewEntries = imageFiles
    .map((item) => ({ item, url: imagePreviewUrls[item.id] }))
    .filter((entry): entry is { item: MailFileItem; url: string } => Boolean(entry.url));
  const previewImages = previewEntries.map((entry) => entry.url);
  const previewNames = previewEntries.map((entry) => entry.item.name);

  const contextItem = useMemo(
    () => files.find((item) => item.id === contextMenu?.itemId) ?? null,
    [contextMenu?.itemId, files],
  );

  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [contextMenu]);

  useEffect(() => {
    let cancelled = false;
    const createdObjectUrls: string[] = [];

    setImagePreviewUrls({});

    imageFiles.forEach((file) => {
      void (async () => {
        try {
          const objectUrl = await downloadAttachmentBlobUrl(file.id);
          if (cancelled) {
            URL.revokeObjectURL(objectUrl);
            return;
          }
          createdObjectUrls.push(objectUrl);
          setImagePreviewUrls((prev) => ({ ...prev, [file.id]: objectUrl }));
        } catch {
          setImagePreviewUrls((prev) => ({ ...prev, [file.id]: "" }));
        }
      })();
    });

    return () => {
      cancelled = true;
      createdObjectUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [imageFiles]);

  useEffect(() => {
    if (previewIndex === null) return;
    if (previewImages.length === 0) {
      setPreviewIndex(null);
      return;
    }
    if (previewIndex >= previewImages.length) {
      setPreviewIndex(previewImages.length - 1);
    }
  }, [previewImages, previewIndex]);

  const openConfirmDelete = (ids: string[]) => {
    const normalized = Array.from(new Set(ids.filter(Boolean)));
    if (!normalized.length) return;
    setPendingDeleteIds(normalized);
    setConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!pendingDeleteIds.length) return;
    setDeleting(true);
    try {
      if (pendingDeleteIds.length === 1) {
        await onDeleteOne(pendingDeleteIds[0]);
      } else {
        await onDeleteSelected(pendingDeleteIds);
      }
      setConfirmOpen(false);
      setPendingDeleteIds([]);
    } finally {
      setDeleting(false);
    }
  };

  const openContextMenu = (event: React.MouseEvent, item: MailFileItem) => {
    event.preventDefault();
    event.stopPropagation();
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      itemId: item.id,
    });
  };

  const openItem = (item: MailFileItem) => {
    if (isImageLikeAttachment(item)) {
      const idx = previewEntries.findIndex((entry) => entry.item.id === item.id);
      if (idx >= 0) setPreviewIndex(idx);
      return;
    }
    window.open(buildMailAttachmentDownloadUrl(item.id), "_blank", "noopener,noreferrer");
  };

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        Cargando archivos...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-destructive">
        {error}
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-4">
        <button
          type="button"
          onClick={() => (allVisibleSelected ? onClearSelection() : onSelectVisible(files.map((item) => item.id)))}
          className="flex h-8 items-center gap-2 rounded-md px-2 text-sm hover:bg-mail-hover"
        >
          <input
            type="checkbox"
            checked={allVisibleSelected}
            readOnly
            className="size-4 accent-mail-accent pointer-events-none"
          />
          <span>Seleccionar</span>
        </button>
        {selected.length > 0 ? (
          <button
            type="button"
            onClick={() => openConfirmDelete(selected)}
            className="inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-sm text-destructive hover:bg-mail-hover"
          >
            <Trash2 className="size-4" />
            Eliminar ({selected.length})
          </button>
        ) : null}
        <span className="ml-auto text-xs text-muted-foreground">
          {total} archivo(s)
        </span>
      </div>

      <div className="scroll-area flex-1 overflow-y-auto bg-mail-surface/30 p-4">
        {files.length === 0 ? (
          <div className="py-14 text-center text-sm text-muted-foreground">No hay archivos para mostrar</div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(156px,1fr))] gap-3">
            {files.map((item) => {
              const selectedItem = selectedIds.has(item.id);
              const isContextTarget = contextMenu?.itemId === item.id;
              const visual = getFileVisual(item);
              const previewUrl = imagePreviewUrls[item.id];
              const isImageLike = isImageLikeAttachment(item);
              const imageUnavailable = isImageLike && previewUrl === "";
              const ext = getExtension(item.name) || "file";

              return (
                <Tooltip
                  key={item.id}
                  delayDuration={120}
                  open={contextMenu ? false : undefined}
                >
                  <TooltipTrigger asChild>
                    <article
                      onContextMenu={(event) => openContextMenu(event, item)}
                      className={cn(
                        "group relative h-[172px] overflow-hidden rounded-lg border bg-background p-2.5",
                        "transition hover:border-primary/40 hover:shadow-sm",
                        selectedItem && "border-primary/60 bg-primary/5",
                        isContextTarget && "ring-2 ring-primary/40",
                      )}
                    >
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <input
                          type="checkbox"
                          checked={selectedItem}
                          onChange={() => onToggleSelect(item.id)}
                          className="size-4 accent-mail-accent"
                        />
                        <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase", visual.tagClassName)}>
                          {ext}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => openItem(item)}
                        className={cn(
                          "flex h-[88px] w-full items-center justify-center rounded-md border",
                          visual.surfaceClassName,
                        )}
                      >
                        {isImageLike ? (
                          previewUrl ? (
                            <img
                              src={previewUrl}
                              alt={item.name}
                              className="max-h-[76px] max-w-[120px] object-contain"
                              loading="lazy"
                            />
                          ) : (
                            <div className="flex flex-col items-center gap-1">
                              <FileImage className={cn("size-8", visual.iconClassName)} />
                              {imageUnavailable ? (
                                <span className="text-[10px] font-medium text-muted-foreground">Imagen inexistente</span>
                              ) : null}
                            </div>
                          )
                        ) : (
                          <visual.Icon className={cn("size-11", visual.iconClassName)} />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => openItem(item)}
                        className="mt-2 w-full text-left"
                      >
                        <span className="line-clamp-2 text-xs font-medium leading-4 text-foreground group-hover:underline">
                          {item.name}
                        </span>
                      </button>

                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {formatMailAttachmentSize(item.sizeBytes)}
                      </p>
                    </article>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[260px] rounded-lg px-3 py-2 text-xs">
                    <p className="font-semibold text-foreground">{item.name}</p>
                    <p className="mt-1 text-muted-foreground">Tipo: {item.mimeType || "desconocido"}</p>
                    <p className="text-muted-foreground">Tamaño: {formatMailAttachmentSize(item.sizeBytes)}</p>
                    <p className="text-muted-foreground">
                      Fecha: {new Date(item.createdAt).toLocaleString("es-PE")}
                    </p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        )}
      </div>

      {contextMenu && contextItem
        ? createPortal(
            <>
              <button
                type="button"
                aria-label="Cerrar menu contextual"
                className="fixed inset-0 z-[79] cursor-default bg-transparent"
                onClick={() => setContextMenu(null)}
                onContextMenu={(event) => {
                  event.preventDefault();
                }}
              />
              <div
                className="fixed z-[80] min-w-[170px] rounded-lg border border-border bg-popover p-1.5 shadow-xl"
                style={{
                  top: Math.min(contextMenu.y, window.innerHeight - 120),
                  left: Math.min(contextMenu.x, window.innerWidth - 190),
                }}
                onContextMenu={(event) => event.preventDefault()}
              >
                <a
                  href={buildMailAttachmentDownloadUrl(contextItem.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => {
                    setContextMenu(null);
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-mail-hover"
                >
                  <Download className="size-4" />
                  Descargar
                </a>
                <button
                  type="button"
                  onClick={() => {
                    openConfirmDelete([contextItem.id]);
                    setContextMenu(null);
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-destructive hover:bg-mail-hover"
                >
                  <Trash2 className="size-4" />
                  Eliminar
                </button>
              </div>
            </>,
            document.body,
          )
        : null}

      <ImagePreviewModal
        open={previewIndex !== null && previewImages.length > 0}
        images={previewImages}
        currentIndex={previewIndex ?? 0}
        onClose={() => setPreviewIndex(null)}
        onPrevious={() =>
          setPreviewIndex((current) => {
            if (current === null || previewImages.length === 0) return null;
            return (current - 1 + previewImages.length) % previewImages.length;
          })
        }
        onNext={() =>
          setPreviewIndex((current) => {
            if (current === null || previewImages.length === 0) return null;
            return (current + 1) % previewImages.length;
          })
        }
        fileNames={previewNames}
        altPrefix="Archivo imagen"
      />

      <AlertModal
        open={confirmOpen}
        onClose={() => {
          if (deleting) return;
          setConfirmOpen(false);
          setPendingDeleteIds([]);
        }}
        onConfirm={() => {
          void handleConfirmDelete();
        }}
        type="deleted"
        title="Confirmar eliminación"
        confirmText="Eliminar"
        cancelText="Cancelar"
        loading={deleting}
        message={
          pendingDeleteIds.length <= 1
            ? "¿Estás seguro de eliminar este archivo?"
            : `¿Estás seguro de eliminar ${pendingDeleteIds.length} archivos?`
        }
      />
    </div>
  );
}
