import { Popover } from '@/components/modales/Popover';
import { Eye, EyeOff, GripVertical, Pin, RotateCcw, Settings2 } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import type { DataTableColumnManagerItem } from './types';

type Props = {
    columns: DataTableColumnManagerItem[];
    visibleColumnIds: string[];
    orderedColumnIds: string[];
    onToggle: (columnId: string) => void;
    onMove: (columnId: string, targetColumnId: string) => void;
    onReset: () => void;
};

function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(' ');
}

export function DataTableColumnManager({ columns, visibleColumnIds, orderedColumnIds, onToggle, onMove, onReset }: Props) {
    const [draggingColumnId, setDraggingColumnId] = useState<string | null>(null);
    const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null);
    const [open, setOpen] = useState(false);
    const buttonRef = useRef<HTMLButtonElement | null>(null);

    const orderedColumns = useMemo(() => {
        const map = new Map(columns.map((column) => [column.id, column]));
        return orderedColumnIds.map((id) => map.get(id)).filter(Boolean) as DataTableColumnManagerItem[];
    }, [columns, orderedColumnIds]);

    return (
        <div className="relative z-80 inline-block">
            <button
                ref={buttonRef}
                type="button"
                aria-expanded={open}
                aria-haspopup="dialog"
                onClick={() => setOpen((current) => !current)}
                className={cn(
                    'inline-flex h-11 items-center gap-2 rounded-md border px-4 text-xs font-medium shadow-sm transition',
                    open ? 'border-primary/30 bg-primary/5 text-foreground' : 'border-border/70 bg-background text-foreground hover:bg-muted/50',
                )}
            >
                <Settings2 className="h-4 w-4" />
                columnas
            </button>

            <Popover
                open={open}
                onClose={() => setOpen(false)}
                anchorRef={buttonRef}
                placement="bottom-end"
                offset={12}
                animation="scale"
                hideHeader
                bodyClassName="w-[22rem] p-3"
                className="border-border/70 bg-background/95 shadow-2xl backdrop-blur-xl"
            >
                <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                        <p className="text-xs font-semibold text-foreground">Columnas</p>
                        <p className="mt-1 text-xs text-muted-foreground">Activa, oculta y ordena arrastrando.</p>
                    </div>

                    <button
                        type="button"
                        onClick={onReset}
                        className="inline-flex items-center gap-1 rounded-xl px-2.5 py-2 text-xs text-muted-foreground transition hover:bg-muted hover:text-foreground"
                    >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Restablecer
                    </button>
                </div>

                <div className="scrollbar-panel max-h-[min(70vh,26rem)] space-y-2 overflow-y-auto pr-1">
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
                                    setDragOverColumnId(column.id);
                                }}
                                onDragLeave={() => {
                                    if (dragOverColumnId === column.id) {
                                        setDragOverColumnId(null);
                                    }
                                }}
                                onDrop={() => {
                                    if (!draggingColumnId || draggingColumnId === column.id) {
                                        setDragOverColumnId(null);
                                        return;
                                    }

                                    onMove(draggingColumnId, column.id);
                                    setDraggingColumnId(null);
                                    setDragOverColumnId(null);
                                }}
                                onDragEnd={() => {
                                    setDraggingColumnId(null);
                                    setDragOverColumnId(null);
                                }}
                                className={cn(
                                    'flex items-center gap-2 rounded-xl border px-2 py-2 transition',
                                    'border-border/60 bg-background',
                                    draggingColumnId === column.id && 'scale-[0.99] opacity-60',
                                    dragOverColumnId === column.id && 'border-primary/40 bg-primary/5',
                                    canDrag && 'cursor-grab active:cursor-grabbing hover:border-border hover:bg-muted/30',
                                )}
                            >
                                <div
                                    className={cn(
                                        'flex h-9 w-9 items-center justify-center rounded-xl',
                                        canDrag ? 'text-muted-foreground' : 'text-muted-foreground/40',
                                    )}
                                >
                                    <GripVertical className="h-4 w-4" />
                                </div>

                                <button
                                    type="button"
                                    onClick={() => column.hideable !== false && onToggle(column.id)}
                                    disabled={column.hideable === false}
                                    className={cn(
                                        'inline-flex h-9 w-9 items-center justify-center rounded-xl border transition',
                                        checked ? 'border-primary/25 bg-primary/10 text-primary' : 'border-border/70 text-muted-foreground hover:bg-muted',
                                        column.hideable === false && 'cursor-not-allowed opacity-70',
                                    )}
                                    title={checked ? 'Ocultar columna' : 'Mostrar columna'}
                                >
                                    {checked ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                                </button>

                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-xs font-medium text-foreground">{column.header}</p>

                                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                                        {column.hideable === false ? (
                                            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">Fija visible</span>
                                        ) : null}

                                        {isPinned ? (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                                                <Pin className="h-3 w-3" />
                                                Pin {column.pinned}
                                            </span>
                                        ) : null}

                                        {isLocked ? (
                                            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">Posicion bloqueada</span>
                                        ) : null}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </Popover>
        </div>
    );
}
