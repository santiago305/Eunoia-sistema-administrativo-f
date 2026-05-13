import { useEffect, useRef, useState } from "react";
import { ChevronDown, Trash2, MailOpen, Mail as MailIcon, ChevronLeft, ChevronRight, RefreshCw, MoreVertical, Archive } from "lucide-react";
import { cn } from "@/shared/lib/utils";

interface Props {
  total: number;
  start: number;
  end: number;
  page: number;
  pageCount: number;
  pageMailIds: string[];
  pageReadIds: string[];
  pageUnreadIds: string[];
  pageStarredIds: string[];
  selectedIds: Set<string>;
  folder: string;
  onSelectVisible: (ids: string[]) => void;
  onClearSelection: () => void;
  onSetReadBulk: (ids: string[], read: boolean) => void;
  onDeleteBulk: (ids: string[]) => void;
  onArchiveBulk: (ids: string[], archive: boolean) => void;
  onPrevPage: () => void;
  onNextPage: () => void;
  onRefresh: () => void;
}

export default function MailToolbar(props: Props) {
  const selectedArr = Array.from(props.selectedIds);
  const allSelected = props.pageMailIds.length > 0 && props.pageMailIds.every((id) => props.selectedIds.has(id));
  const someSelected = selectedArr.length > 0;

  const [popoverOpen, setPopoverOpen] = useState(false);
  const popRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => popRef.current && !popRef.current.contains(e.target as Node) && setPopoverOpen(false);
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const handleSelectClick = () => {
    if (allSelected || someSelected) props.onClearSelection();
    else props.onSelectVisible(props.pageMailIds);
  };

  const allUnread = someSelected && selectedArr.every((id) => props.pageUnreadIds.includes(id));
  const markRead = !allUnread;

  return (
    <div className="h-12 flex items-center px-4 gap-1 border-b border-border bg-background shrink-0">
      <div className="flex items-center" ref={popRef}>
        <button onClick={handleSelectClick} className="size-9 rounded-full hover:bg-mail-hover flex items-center justify-center" title="Seleccionar">
          <input
            type="checkbox"
            checked={allSelected}
            ref={(el) => {
              if (el) el.indeterminate = someSelected && !allSelected;
            }}
            onChange={() => {}}
            className="size-4 accent-mail-accent pointer-events-none"
          />
        </button>
        <button onClick={() => setPopoverOpen((v) => !v)} className="size-7 rounded-full hover:bg-mail-hover flex items-center justify-center">
          <ChevronDown className="size-4" />
        </button>
        {popoverOpen ? (
          <div className="absolute top-12 left-4 bg-popover rounded-lg shadow-popover border border-border py-1 z-40 min-w-[140px]">
            {[
              { label: "Todos", action: () => props.onSelectVisible(props.pageMailIds) },
              { label: "Ninguno", action: () => props.onClearSelection() },
              { label: "Leídos", action: () => props.onSelectVisible(props.pageReadIds) },
              { label: "No leídos", action: () => props.onSelectVisible(props.pageUnreadIds) },
              { label: "Destacados", action: () => props.onSelectVisible(props.pageStarredIds) },
            ].map((opt) => (
              <button key={opt.label} onClick={() => { opt.action(); setPopoverOpen(false); }} className="block w-full text-left px-4 py-1.5 text-sm hover:bg-mail-hover">
                {opt.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {someSelected ? (
        <>
          <button onClick={() => props.onDeleteBulk(selectedArr)} className="size-9 rounded-full hover:bg-mail-hover flex items-center justify-center" title="Eliminar">
            <Trash2 className="size-5" />
          </button>
          <button onClick={() => props.onSetReadBulk(selectedArr, markRead)} className="size-9 rounded-full hover:bg-mail-hover flex items-center justify-center" title={markRead ? "Marcar como leído" : "Marcar como no leído"}>
            {markRead ? <MailOpen className="size-5" /> : <MailIcon className="size-5" />}
          </button>
          <button onClick={() => props.onArchiveBulk(selectedArr, props.folder !== "archived")} className="size-9 rounded-full hover:bg-mail-hover flex items-center justify-center" title={props.folder === "archived" ? "Desarchivar" : "Archivar"}>
            <Archive className="size-5" />
          </button>
          <button className="size-9 rounded-full hover:bg-mail-hover flex items-center justify-center">
            <MoreVertical className="size-5" />
          </button>
        </>
      ) : (
        <button className="size-9 rounded-full hover:bg-mail-hover flex items-center justify-center" title="Actualizar" onClick={props.onRefresh}>
          <RefreshCw className="size-5" />
        </button>
      )}

      <div className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
        <span className="hidden sm:inline">{props.total === 0 ? "0" : `${props.start + 1}–${props.end}`} de {props.total}</span>
        <button onClick={props.onPrevPage} disabled={props.page <= 0} className={cn("size-9 rounded-full flex items-center justify-center", props.page <= 0 ? "text-muted-foreground/40" : "hover:bg-mail-hover")}>
          <ChevronLeft className="size-5" />
        </button>
        <button onClick={props.onNextPage} disabled={props.page >= props.pageCount - 1} className={cn("size-9 rounded-full flex items-center justify-center", props.page >= props.pageCount - 1 ? "text-muted-foreground/40" : "hover:bg-mail-hover")}>
          <ChevronRight className="size-5" />
        </button>
      </div>
    </div>
  );
}
