import { GripVertical, RotateCcw, Settings2, Eye, EyeOff, Pin } from "lucide-react";
import { useMemo, useState } from "react";
import type { DataTableColumnManagerItem } from "./types";

type Props = {
  columns: DataTableColumnManagerItem[];
  visibleColumnIds: string[];
  orderedColumnIds: string[];
  onToggle: (columnId: string) => void;
  onMove: (columnId: string, targetColumnId: string) => void;
  onReset: () => void;
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function DataTableColumnManager({
  columns,
  visibleColumnIds,
  orderedColumnIds,
  onToggle,
  onMove,
  onReset,
}: Props) {
  const [draggingColumnId, setDraggingColumnId] = useState<string | null>(null);

  const orderedColumns = useMemo(() => {
    const map = new Map(columns.map((column) => [column.id, column]));
    return orderedColumnIds.map((id) => map.get(id)).filter(Boolean) as DataTableColumnManagerItem[];
  }, [columns, orderedColumnIds]);

  return (
    <div className="relative inline-block">
      <details className="group">
        <summary className="list-none">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground shadow-sm transition hover:bg-muted/50"
          >
            <Settings2 className="h-4 w-4" />
            Configurar tabla
          </button>
        </summary>

        <div className="absolute right-0 z-30 mt-2 w-[22rem] rounded-2xl border border-border bg-background p-3 shadow-xl">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-foreground">Columnas</p>
              <p className="text-xs text-muted-foreground">
                Activa, oculta y ordena arrastrando.
              </p>
            </div>

            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Restablecer
            </button>
          </div>

          <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
            {orderedColumns.map((column) => {
              const checked = visibleColumnIds.includes(column.id);
              const isPinned = !!column.pinned;
              const isLocked = column.lockPosition === true;
              const canDrag = !isLocked;

              return (
                <div
                  key={column.id}
                  draggable={canDrag}
                  onDragStart={() => canDrag && setDraggingColumnId(column.id)}
                  onDragOver={(event) => {
                    if (!canDrag) return;
                    event.preventDefault();
                  }}
                  onDrop={() => {
                    if (!draggingColumnId || draggingColumnId === column.id) return;
                    onMove(draggingColumnId, column.id);
                    setDraggingColumnId(null);
                  }}
                  onDragEnd={() => setDraggingColumnId(null)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border border-border/70 px-3 py-2 transition",
                    draggingColumnId === column.id && "opacity-60",
                    canDrag && "cursor-grab active:cursor-grabbing",
                  )}
                >
                  <div className="text-muted-foreground">
                    <GripVertical className="h-4 w-4" />
                  </div>

                  <button
                    type="button"
                    onClick={() => column.hideable !== false && onToggle(column.id)}
                    disabled={column.hideable === false}
                    className={cn(
                      "inline-flex h-8 w-8 items-center justify-center rounded-lg border transition",
                      checked
                        ? "border-primary/30 bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:bg-muted",
                      column.hideable === false && "cursor-not-allowed opacity-60",
                    )}
                    title={checked ? "Ocultar columna" : "Mostrar columna"}
                  >
                    {checked ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </button>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{column.header}</p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {column.hideable === false ? (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                          Fija visible
                        </span>
                      ) : null}
                      {isPinned ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                          <Pin className="h-3 w-3" />
                          Pin {column.pinned}
                        </span>
                      ) : null}
                      {isLocked ? (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                          Posición bloqueada
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </details>
    </div>
  );
}
