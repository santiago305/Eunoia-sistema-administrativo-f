import type { MouseEvent, ReactNode } from "react";
import { Check, CheckSquare, Loader2, Square } from "lucide-react";
import type { DataTableColumn } from "./types";

type CopyFeedback = {
  key: string;
  status: "copying" | "copied";
};

type Props<T> = {
  data: T[];
  columns: DataTableColumn<T>[];
  loading?: boolean;
  emptyMessage: string;
  animated?: boolean;
  visibleOnDesktop?: boolean;
  rowClickable?: boolean;
  selectableRows?: boolean;
  selectedRowKeys?: string[];
  isRowSelectable?: (row: T, index: number) => boolean;
  onToggleRow?: (row: T, index: number) => void;
  onRowClick?: (row: T, index: number) => void;
  rowClassName?: (row: T, index: number) => string | undefined;
  resolveRowKey: (row: T, index: number) => string;
  copyFeedback?: CopyFeedback | null;
  onCopyCell?: (
    text: string,
    row: T,
    index: number,
    column: DataTableColumn<T>,
  ) => void;
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function getColumnValue<T extends Record<string, unknown>>(
  row: T,
  index: number,
  column: DataTableColumn<T>,
): ReactNode {
  return (
    column.cardCell?.(row, index) ??
    column.cell?.(row, index) ??
    (column.accessorKey ? String(row[column.accessorKey] ?? "") : null)
  );
}

export function DataTableResponsiveCards<T extends Record<string, unknown>>({
  data,
  columns,
  loading,
  emptyMessage,
  animated = true,
  visibleOnDesktop = false,
  rowClickable,
  selectableRows = false,
  selectedRowKeys = [],
  isRowSelectable,
  onToggleRow,
  onRowClick,
  rowClassName,
  resolveRowKey,
  copyFeedback,
  onCopyCell,
}: Props<T>) {
  const responsiveClassName = visibleOnDesktop ? "" : "md:hidden";
  const showSkeletonLoading = loading && data.length === 0;

  if (showSkeletonLoading) {
    return (
      <div className={cn("space-y-3", responsiveClassName)}>
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="rounded-2xl border border-border bg-background p-4 shadow-sm"
          >
            <div className="mb-4 h-5 w-1/2 animate-pulse rounded bg-muted" />
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((__, line) => (
                <div
                  key={line}
                  className="h-4 w-full animate-pulse rounded bg-muted"
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className={cn("rounded-2xl border border-border bg-background px-4 py-10 text-center text-sm text-muted-foreground", responsiveClassName)}>
        {emptyMessage}
      </div>
    );
  }

  const cardColumns = columns.filter((column) => column.showInCards !== false);

  return (
    <div className={cn("relative space-y-3", responsiveClassName)}>
      {loading ? (
        <div className="pointer-events-none absolute right-3 top-3 z-10 inline-flex items-center rounded-full border border-border/70 bg-background/95 px-2.5 py-1 text-[11px] font-medium text-muted-foreground shadow-sm backdrop-blur">
          Actualizando...
        </div>
      ) : null}

      {data.map((row, index) => {
        const titleColumn =
          cardColumns.find((column) => column.cardTitle) ?? cardColumns[0];
        const detailColumns = cardColumns.filter(
          (column) => column.id !== titleColumn?.id,
        );
        const isTitleClickable =
          !!titleColumn?.onCellClick && titleColumn.clickable !== false;
        const shouldStopTitleRowClick =
          !!titleColumn &&
          (titleColumn.stopRowClick || titleColumn.copy || isTitleClickable);

        const cardClasses = cn(
          "rounded-2xl border border-border bg-background p-4 shadow-sm",
          rowClickable &&
            "cursor-pointer transition hover:border-primary/30 hover:bg-muted/20",
          rowClassName?.(row, index),
        );

        const handleCardClick = () => {
          if (!rowClickable) return;
          onRowClick?.(row, index);
        };

        const handleColumnClick =
          (column: DataTableColumn<T>) => (event: MouseEvent<HTMLElement>) => {
            const isColumnClickable =
              !!column.onCellClick && column.clickable !== false;
            const shouldStopRowClick =
              column.stopRowClick || column.copy || isColumnClickable;

            if (!shouldStopRowClick) return;

            event.stopPropagation();

            if (column.copy) {
              const text = event.currentTarget.innerText ?? event.currentTarget.textContent ?? "";
              onCopyCell?.(text, row, index, column);
              return;
            }

            if (isColumnClickable) {
              column.onCellClick?.(row, index, event);
            }
          };

        const content = (
          <div className={cn(cardClasses, selectedRowKeys.includes(resolveRowKey(row, index)) && "bg-primary/5")}>
            {selectableRows ? (
              <div className="mb-3 flex justify-end">
                <button
                  type="button"
                  disabled={isRowSelectable ? !isRowSelectable(row, index) : false}
                  aria-label={selectedRowKeys.includes(resolveRowKey(row, index)) ? "Deseleccionar fila" : "Seleccionar fila"}
                  onClick={(event) => {
                    event.stopPropagation();
                    if (isRowSelectable && !isRowSelectable(row, index)) return;
                    onToggleRow?.(row, index);
                  }}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-border/70 bg-background transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {selectedRowKeys.includes(resolveRowKey(row, index)) ? <CheckSquare className="h-4 w-4" aria-hidden="true" /> : <Square className="h-4 w-4" aria-hidden="true" />}
                </button>
              </div>
            ) : null}
            {titleColumn ? (
              <div className="mb-4">
                <div className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  {titleColumn.cardLabel || titleColumn.header}
                </div>

                <div
                  onClick={
                    shouldStopTitleRowClick
                      ? handleColumnClick(titleColumn)
                      : undefined
                  }
                  className={cn(
                    "mt-1 text-base font-semibold text-foreground",
                    isTitleClickable && "cursor-pointer",
                    (titleColumn.stopRowClick || titleColumn.copy) && "cursor-default",
                    titleColumn.copy &&
                      "group/copyable cursor-pointer transition-colors hover:text-primary hover:[&_*]:!text-primary",
                    titleColumn.copy &&
                      copyFeedback?.key === `${resolveRowKey(row, index)}:${titleColumn.id}` &&
                      "text-primary [&_*]:!text-primary",
                  )}
                >
                  {getColumnValue(row, index, titleColumn)}
                  {titleColumn.copy && copyFeedback?.key === `${resolveRowKey(row, index)}:${titleColumn.id}` ? (
                    copyFeedback.status === "copying" ? (
                      <Loader2 className="ml-1 inline h-3 w-3 animate-spin" aria-label="Copiando" />
                    ) : (
                      <Check className="ml-1 inline h-3 w-3" aria-label="Copiado" />
                    )
                  ) : null}
                </div>
              </div>
            ) : null}

            <div className="space-y-3">
              {detailColumns.map((column) => {
                const isColumnClickable =
                  !!column.onCellClick && column.clickable !== false;
                const shouldStopRowClick =
                  column.stopRowClick || column.copy || isColumnClickable;
                const copyCellKey = `${resolveRowKey(row, index)}:${column.id}`;
                const isCopyFeedbackVisible =
                  column.copy && copyFeedback?.key === copyCellKey;

                return (
                  <div
                    key={column.id}
                    onClick={
                      shouldStopRowClick ? handleColumnClick(column) : undefined
                    }
                    className={cn(
                      "flex items-start justify-between gap-3 border-t border-border/60 pt-3 first:border-t-0 first:pt-0",
                      isColumnClickable && "cursor-pointer",
                      (column.stopRowClick || column.copy) && !isColumnClickable && "cursor-default",
                      column.copy &&
                        "group/copyable cursor-pointer transition-colors hover:text-primary hover:[&_*]:!text-primary",
                      isCopyFeedbackVisible && "text-primary [&_*]:!text-primary",
                    )}
                  >
                    <span className="min-w-0 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                      {column.cardLabel || column.header}
                    </span>

                    <div className="text-right text-sm text-foreground">
                      {getColumnValue(row, index, column)}
                      {isCopyFeedbackVisible ? (
                        copyFeedback?.status === "copying" ? (
                          <Loader2 className="ml-1 inline h-3 w-3 animate-spin" aria-label="Copiando" />
                        ) : (
                          <Check className="ml-1 inline h-3 w-3" aria-label="Copiado" />
                        )
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );

        return (
          <div
            key={resolveRowKey(row, index)}
            onClick={handleCardClick}
            className={cn(
              animated && "transition-transform duration-200 ease-out",
            )}
          >
            {content}
          </div>
        );
      })}
    </div>
  );
}
