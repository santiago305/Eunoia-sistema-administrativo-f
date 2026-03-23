import { motion } from "framer-motion";
import { useEffect, useMemo } from "react";
import { DataTableColumnToggle } from "./DataTableColumnToggle";
import { DataTablePagination } from "./DataTablePagination";
import type { DataTableProps } from "./types";
import { useLocalStorage } from "./use-local-storage";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function DataTable<T extends Record<string, unknown>>({
  data,
  columns,
  tableId,
  selectableColumns = false,
  loading = false,
  emptyMessage = "No hay registros disponibles.",
  rowKey,
  striped = false,
  hoverable = true,
  animated = true,
  pagination,
  onPageChange,
  className,
  tableClassName,
  onRowClick,
  rowClickable = true,
  rowClassName,
}: DataTableProps<T>) {
  const storageKey = `data-table-columns:${tableId}`;

  const defaultVisibleColumns = useMemo(() => {
    return columns
      .filter((column) => column.visible !== false)
      .map((column) => column.id);
  }, [columns]);

  const [visibleColumnIds, setVisibleColumnIds] = useLocalStorage<string[]>(
    storageKey,
    defaultVisibleColumns,
  );

  useEffect(() => {
    const validIds = columns.map((column) => column.id);

    setVisibleColumnIds((prev) => {
      const filtered = prev.filter((id) => validIds.includes(id));

      if (filtered.length === 0) {
        return defaultVisibleColumns;
      }

      const missingDefaultIds = defaultVisibleColumns.filter(
        (id) => !filtered.includes(id),
      );

      if (missingDefaultIds.length > 0) {
        return [...filtered, ...missingDefaultIds];
      }

      return filtered;
    });
  }, [columns, defaultVisibleColumns, setVisibleColumnIds]);

  const visibleColumns = useMemo(() => {
    if (!selectableColumns) return columns;
    return columns.filter((column) => visibleColumnIds.includes(column.id));
  }, [columns, selectableColumns, visibleColumnIds]);

  const toggleColumn = (columnId: string) => {
    setVisibleColumnIds((prev) => {
      const exists = prev.includes(columnId);

      if (exists) {
        const next = prev.filter((id) => id !== columnId);
        return next.length > 0 ? next : prev;
      }

      return [...prev, columnId];
    });
  };

  const resetColumns = () => {
    setVisibleColumnIds(defaultVisibleColumns);
  };

  const resolveRowKey = (row: T, index: number) => {
    if (typeof rowKey === "function") return rowKey(row, index);
    if (typeof rowKey === "string") return String(row[rowKey]);
    return String(index);
  };

  const isRowClickable = !!onRowClick && rowClickable !== false;

  return (
    <div className={cn("w-full", className)}>
      {selectableColumns && (
        <div className="mb-4 flex justify-end">
          <DataTableColumnToggle
            columns={columns.map((column) => ({
              id: column.id,
              header: column.header,
              hideable: column.hideable,
            }))}
            visibleColumnIds={visibleColumnIds}
            onToggle={toggleColumn}
            onReset={resetColumns}
          />
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-border bg-background shadow-sm">
        <div className="overflow-x-auto">
          <table className={cn("w-full min-w-full text-sm", tableClassName)}>
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {visibleColumns.map((column) => (
                  <th
                    key={column.id}
                    className={cn(
                      "px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground",
                      column.headerClassName,
                    )}
                  >
                    {column.header}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, rowIndex) => (
                  <tr key={rowIndex} className="border-b border-border/60">
                    {visibleColumns.map((column) => (
                      <td key={column.id} className="px-4 py-4">
                        <div className="h-4 w-full animate-pulse rounded bg-muted" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : data.length === 0 ? (
                <tr>
                  <td
                    colSpan={visibleColumns.length || 1}
                    className="px-4 py-10 text-center text-sm text-muted-foreground"
                  >
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                data.map((row, index) => {
                  const rowClasses = cn(
                    "border-b border-border/60 transition-colors",
                    hoverable && "hover:bg-muted/40",
                    striped && index % 2 !== 0 && "bg-muted/[0.18]",
                    isRowClickable && "cursor-pointer",
                    rowClassName?.(row, index),
                  );

                  const motionProps = animated
                    ? {
                        initial: { opacity: 0, y: 8 },
                        animate: { opacity: 1, y: 0 },
                        transition: { duration: 0.2, delay: index * 0.03 },
                      }
                    : {};

                  if (animated) {
                    return (
                      <motion.tr
                        key={resolveRowKey(row, index)}
                        {...motionProps}
                        onClick={
                          isRowClickable
                            ? () => onRowClick?.(row, index)
                            : undefined
                        }
                        className={rowClasses}
                      >
                        {visibleColumns.map((column) => {
                          const isCellClickable =
                            !!column.onCellClick && column.clickable !== false;

                          return (
                            <td
                              key={column.id}
                              onClick={
                                isCellClickable
                                  ? (event) => {
                                      event.stopPropagation();
                                      column.onCellClick?.(row, index, event);
                                    }
                                  : undefined
                              }
                              className={cn(
                                "px-4 py-3 text-foreground",
                                column.className,
                                isCellClickable &&
                                  "cursor-pointer hover:underline",
                              )}
                            >
                              {column.cell
                                ? column.cell(row, index)
                                : column.accessorKey
                                  ? String(row[column.accessorKey] ?? "")
                                  : null}
                            </td>
                          );
                        })}
                      </motion.tr>
                    );
                  }

                  return (
                    <tr
                      key={resolveRowKey(row, index)}
                      onClick={
                        isRowClickable ? () => onRowClick?.(row, index) : undefined
                      }
                      className={rowClasses}
                    >
                      {visibleColumns.map((column) => {
                        const isCellClickable =
                          !!column.onCellClick && column.clickable !== false;

                        return (
                          <td
                            key={column.id}
                            onClick={
                              isCellClickable
                                ? (event) => {
                                    event.stopPropagation();
                                    column.onCellClick?.(row, index, event);
                                  }
                                : undefined
                            }
                            className={cn(
                              "px-4 py-3 text-foreground",
                              column.className,
                              isCellClickable &&
                                "cursor-pointer hover:underline",
                            )}
                          >
                            {column.cell
                              ? column.cell(row, index)
                              : column.accessorKey
                                ? String(row[column.accessorKey] ?? "")
                                : null}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {pagination && onPageChange ? (
        <DataTablePagination
          page={pagination.page}
          limit={pagination.limit}
          total={pagination.total}
          onPageChange={onPageChange}
        />
      ) : null}
    </div>
  );
}