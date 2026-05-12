import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, Mail as MailIcon, MailOpen, MoreVertical, RefreshCw, Trash2 } from "lucide-react";
import { cn } from "@/shared/lib/utils";

type BulkAction = "MARK_AS_READ" | "MARK_AS_UNREAD" | "DELETE" | "RESTORE";

interface Props {
  allVisibleSelected: boolean;
  hasSelection: boolean;
  rangeStart: number;
  rangeEnd: number;
  total: number;
  page: number;
  maxPage: number;
  onSelectToggle: () => void;
  onSelectAllVisible: () => void;
  onSelectNone: () => void;
  onSelectRead: () => void;
  onSelectUnread: () => void;
  onBulkAction: (action: BulkAction) => void;
  onRefresh: () => void;
  onPrevPage: () => void;
  onNextPage: () => void;
  inTrash: boolean;
}

export default function NotificationMailToolbar({
  allVisibleSelected,
  hasSelection,
  rangeStart,
  rangeEnd,
  total,
  page,
  maxPage,
  onSelectToggle,
  onSelectAllVisible,
  onSelectNone,
  onSelectRead,
  onSelectUnread,
  onBulkAction,
  onRefresh,
  onPrevPage,
  onNextPage,
  inTrash,
}: Props) {
  const [selectionMenuOpen, setSelectionMenuOpen] = useState(false);
  const selectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (selectionRef.current && !selectionRef.current.contains(event.target as Node)) {
        setSelectionMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="h-12 shrink-0 border-b px-4 flex items-center gap-1">
      <div className="flex items-center relative" ref={selectionRef}>
        <button
          type="button"
          onClick={onSelectToggle}
          className="size-9 rounded-full hover:bg-muted flex items-center justify-center"
          aria-label="Seleccionar mensajes"
          title="Seleccionar"
        >
          <input
            type="checkbox"
            checked={allVisibleSelected}
            ref={(el) => {
              if (el) el.indeterminate = hasSelection && !allVisibleSelected;
            }}
            onChange={() => {}}
            className="size-4 pointer-events-none"
          />
        </button>
        <button
          type="button"
          onClick={() => setSelectionMenuOpen((prev) => !prev)}
          className="size-7 rounded-full hover:bg-muted flex items-center justify-center"
          aria-label="Abrir opciones de seleccion"
          title="Opciones de seleccion"
        >
          <ChevronDown className="size-4" />
        </button>
        {selectionMenuOpen ? (
          <div className="absolute top-10 left-0 z-20 min-w-[150px] rounded-md border bg-popover py-1 shadow-md">
            <button className="w-full px-3 py-1.5 text-left text-sm hover:bg-muted" onClick={() => { onSelectAllVisible(); setSelectionMenuOpen(false); }}>
              Todos
            </button>
            <button className="w-full px-3 py-1.5 text-left text-sm hover:bg-muted" onClick={() => { onSelectNone(); setSelectionMenuOpen(false); }}>
              Ninguno
            </button>
            <button className="w-full px-3 py-1.5 text-left text-sm hover:bg-muted" onClick={() => { onSelectRead(); setSelectionMenuOpen(false); }}>
              Leidos
            </button>
            <button className="w-full px-3 py-1.5 text-left text-sm hover:bg-muted" onClick={() => { onSelectUnread(); setSelectionMenuOpen(false); }}>
              No leidos
            </button>
          </div>
        ) : null}
      </div>

      {hasSelection ? (
        <>
          <button
            type="button"
            onClick={() => onBulkAction(inTrash ? "RESTORE" : "DELETE")}
            className="size-9 rounded-full hover:bg-muted flex items-center justify-center"
            aria-label={inTrash ? "Restaurar mensajes seleccionados" : "Eliminar mensajes seleccionados"}
            title={inTrash ? "Restaurar" : "Eliminar"}
          >
            <Trash2 className="size-5" />
          </button>
          <button
            type="button"
            onClick={() => onBulkAction("MARK_AS_READ")}
            className="size-9 rounded-full hover:bg-muted flex items-center justify-center"
            aria-label="Marcar mensajes seleccionados como leidos"
            title="Marcar como leido"
          >
            <MailOpen className="size-5" />
          </button>
          <button
            type="button"
            onClick={() => onBulkAction("MARK_AS_UNREAD")}
            className="size-9 rounded-full hover:bg-muted flex items-center justify-center"
            aria-label="Marcar mensajes seleccionados como no leidos"
            title="Marcar como no leido"
          >
            <MailIcon className="size-5" />
          </button>
          <button
            type="button"
            className="size-9 rounded-full hover:bg-muted flex items-center justify-center"
            aria-label="Mas opciones"
            title="Mas opciones"
          >
            <MoreVertical className="size-5" />
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={onRefresh}
          className="size-9 rounded-full hover:bg-muted flex items-center justify-center"
          aria-label="Actualizar mensajes"
          title="Actualizar"
        >
          <RefreshCw className="size-5" />
        </button>
      )}

      <div className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
        <span className="hidden sm:inline">{rangeStart}-{rangeEnd} de {total}</span>
        <button
          type="button"
          onClick={onPrevPage}
          disabled={page <= 1}
          className={cn("size-9 rounded-full flex items-center justify-center", page <= 1 ? "text-muted-foreground/40" : "hover:bg-muted")}
          aria-label="Pagina anterior"
          title="Pagina anterior"
        >
          <ChevronLeft className="size-5" />
        </button>
        <button
          type="button"
          onClick={onNextPage}
          disabled={page >= maxPage}
          className={cn("size-9 rounded-full flex items-center justify-center", page >= maxPage ? "text-muted-foreground/40" : "hover:bg-muted")}
          aria-label="Pagina siguiente"
          title="Pagina siguiente"
        >
          <ChevronRight className="size-5" />
        </button>
      </div>
    </div>
  );
}
