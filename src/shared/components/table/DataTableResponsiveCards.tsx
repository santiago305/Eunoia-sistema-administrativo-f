import type { MouseEvent, ReactNode } from "react";
import type { DataTableColumn } from "./types";

type Props<T> = {
  data: T[];
  columns: DataTableColumn<T>[];
  loading?: boolean;
  emptyMessage: string;
  animated?: boolean;
  visibleOnDesktop?: boolean;
  rowClickable?: boolean;
  onRowClick?: (row: T, index: number) => void;
  rowClassName?: (row: T, index: number) => string | undefined;
  resolveRowKey: (row: T, index: number) => string;
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
  onRowClick,
  rowClassName,
  resolveRowKey,
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
          !!titleColumn && (titleColumn.stopRowClick || isTitleClickable);

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
              column.stopRowClick || isColumnClickable;

            if (!shouldStopRowClick) return;

            event.stopPropagation();

            if (isColumnClickable) {
              column.onCellClick?.(row, index, event);
            }
          };

        const content = (
          <div className={cardClasses}>
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
                    titleColumn.stopRowClick && "cursor-default",
                  )}
                >
                  {getColumnValue(row, index, titleColumn)}
                </div>
              </div>
            ) : null}

            <div className="space-y-3">
              {detailColumns.map((column) => {
                const isColumnClickable =
                  !!column.onCellClick && column.clickable !== false;
                const shouldStopRowClick =
                  column.stopRowClick || isColumnClickable;

                return (
                  <div
                    key={column.id}
                    onClick={
                      shouldStopRowClick ? handleColumnClick(column) : undefined
                    }
                    className={cn(
                      "flex items-start justify-between gap-3 border-t border-border/60 pt-3 first:border-t-0 first:pt-0",
                      isColumnClickable && "cursor-pointer",
                      column.stopRowClick && !isColumnClickable && "cursor-default",
                    )}
                  >
                    <span className="min-w-0 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                      {column.cardLabel || column.header}
                    </span>

                    <div className="text-right text-sm text-foreground">
                      {getColumnValue(row, index, column)}
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
