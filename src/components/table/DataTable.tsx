import { motion } from "framer-motion";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CheckSquare,
  MinusSquare,
  Square,
} from "lucide-react";
import { startTransition, useDeferredValue, useEffect, useMemo, useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { DataTableColumnManager } from "./DataTableColumnManager";
import { DataTablePagination } from "./DataTablePagination";
import { DataTableResponsiveCards } from "./DataTableResponsiveCards";
import { DataTableToolbar } from "./DataTableToolbar";
import type {
  DataTableColumn,
  DataTableColumnPreference,
  DataTableProps,
  DataTableSortState,
} from "./types";
import { useLocalStorage } from "./use-local-storage";

function getCellValue<T extends Record<string, unknown>>(
  row: T,
  column: DataTableColumn<T>,
) {
  if (column.accessorKey) return row[column.accessorKey];
  return undefined;
}

function normalizeSearchText(value: unknown) {
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") return JSON.stringify(value).toLowerCase();
  return String(value).toLowerCase();
}

function compareValues(a: unknown, b: unknown) {
  if (a == null && b == null) return 0;
  if (a == null) return -1;
  if (b == null) return 1;
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
  if (typeof a === "number" && typeof b === "number") return a - b;
  if (typeof a === "boolean" && typeof b === "boolean") return Number(a) - Number(b);

  return String(a).localeCompare(String(b), "es", {
    numeric: true,
    sensitivity: "base",
  });
}

export function DataTable<T extends Record<string, unknown>>({
  data,
  columns,
  tableId,
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
  selectableColumns = false,
  showSearch = false,
  searchPlaceholder = "Buscar...",
  searchValue,
  onSearchChange,
  filtersConfig,
  rangeDates,
  searchMode = "client",
  globalSearchFn,
  stickyHeader = true,
  responsiveCards = true,
  responsiveMode = "auto",
  selectableRows = false,
  selectedRowKeys,
  defaultSelectedRowKeys = [],
  onSelectedRowKeysChange,
  initialSort = null,
  controlledSort,
  onSortChange,
  toolbarSearchContent,
  animateRowsThreshold = 12,
}: DataTableProps<T>) {
  const preferenceStorageKey = `data-table-preferences:${tableId}`;
  const controlledSearch = typeof searchValue === "string";
  const [internalSearch, setInternalSearch] = useState("");
  const activeSearch = controlledSearch ? searchValue : internalSearch;
  const deferredSearch = useDeferredValue(activeSearch);
  const isMobile = useIsMobile();

  const [columnPreferences, setColumnPreferences] =
    useLocalStorage<DataTableColumnPreference>(preferenceStorageKey, {
      visibleColumnIds: columns
        .filter((column) => column.visible !== false)
        .map((column) => column.id),
      orderedColumnIds: columns.map((column) => column.id),
    });

  const [internalSelectedRowKeys, setInternalSelectedRowKeys] =
    useState<string[]>(defaultSelectedRowKeys);
  const [internalSort, setInternalSort] =
    useState<DataTableSortState>(initialSort);

  const sort = controlledSort !== undefined ? controlledSort : internalSort;
  const activeSelectedRowKeys = selectedRowKeys ?? internalSelectedRowKeys;

  const resolveRowKey = (row: T, index: number) => {
    if (typeof rowKey === "function") return rowKey(row, index);
    if (typeof rowKey === "string") return String(row[rowKey]);
    return String(index);
  };

  useEffect(() => {
    const validIds = columns.map((column) => column.id);
    const defaultVisibleIds = columns
      .filter((column) => column.visible !== false)
      .map((column) => column.id);
    const defaultOrderedIds = columns.map((column) => column.id);
    const requiredVisibleIds = columns
      .filter((column) => column.hideable === false)
      .map((column) => column.id);

    setColumnPreferences((previous) => {
      const previousVisible = previous?.visibleColumnIds ?? [];
      const previousOrdered = previous?.orderedColumnIds ?? [];
      const visibleColumnIds = previousVisible.filter((id) =>
        validIds.includes(id),
      );
      const missingRequired = requiredVisibleIds.filter(
        (id) => !visibleColumnIds.includes(id),
      );
      const orderedColumnIds = [
        ...previousOrdered.filter((id) => validIds.includes(id)),
        ...defaultOrderedIds.filter((id) => !previousOrdered.includes(id)),
      ];

      return {
        visibleColumnIds:
          visibleColumnIds.length > 0
            ? [...visibleColumnIds, ...missingRequired]
            : defaultVisibleIds,
        orderedColumnIds,
      };
    });
  }, [columns, setColumnPreferences]);

  const orderedColumns = useMemo(() => {
    const columnMap = new Map(columns.map((column) => [column.id, column]));
    const storedOrder = columnPreferences.orderedColumnIds
      .map((id) => columnMap.get(id))
      .filter(Boolean) as DataTableColumn<T>[];

    const pinnedLeft = storedOrder.filter((column) => column.pinned === "left");
    const normal = storedOrder.filter((column) => !column.pinned);
    const pinnedRight = storedOrder.filter((column) => column.pinned === "right");

    return [...pinnedLeft, ...normal, ...pinnedRight];
  }, [columnPreferences.orderedColumnIds, columns]);

  const visibleColumns = useMemo(() => {
    const ids = selectableColumns
      ? columnPreferences.visibleColumnIds
      : columns
        .filter((column) => column.visible !== false)
        .map((column) => column.id);

    return orderedColumns.filter((column) => ids.includes(column.id));
  }, [
    columnPreferences.visibleColumnIds,
    columns,
    orderedColumns,
    selectableColumns,
  ]);

  const canManageColumns =
    selectableColumns &&
    columns.some((column) => column.hideable !== false || !column.lockPosition);

  const toggleColumn = (columnId: string) => {
    const selectedColumn = columns.find((column) => column.id === columnId);
    if (selectedColumn?.hideable === false) return;

    setColumnPreferences((previous) => {
      const exists = previous.visibleColumnIds.includes(columnId);

      if (exists) {
        const nextVisible = previous.visibleColumnIds.filter(
          (id) => id !== columnId,
        );
        return {
          ...previous,
          visibleColumnIds:
            nextVisible.length > 0
              ? nextVisible
              : previous.visibleColumnIds,
        };
      }

      return {
        ...previous,
        visibleColumnIds: [...previous.visibleColumnIds, columnId],
      };
    });
  };

  const moveColumn = (columnId: string, targetColumnId: string) => {
    setColumnPreferences((previous) => {
      const sourceColumn = columns.find((column) => column.id === columnId);
      const targetColumn = columns.find((column) => column.id === targetColumnId);

      if (!sourceColumn || !targetColumn) return previous;
      if (sourceColumn.lockPosition || targetColumn.lockPosition) return previous;
      if (sourceColumn.pinned !== targetColumn.pinned) return previous;

      const nextOrder = [...previous.orderedColumnIds];
      const sourceIndex = nextOrder.indexOf(columnId);
      const targetIndex = nextOrder.indexOf(targetColumnId);

      if (sourceIndex < 0 || targetIndex < 0) return previous;

      nextOrder.splice(sourceIndex, 1);
      nextOrder.splice(targetIndex, 0, columnId);

      return { ...previous, orderedColumnIds: nextOrder };
    });
  };

  const resetColumns = () => {
    setColumnPreferences({
      visibleColumnIds: columns
        .filter((column) => column.visible !== false)
        .map((column) => column.id),
      orderedColumnIds: columns.map((column) => column.id),
    });
  };

  const filteredData = useMemo(() => {
    if (searchMode === "server") return data;

    const query = deferredSearch.trim().toLowerCase();
    if (!query) return data;

    return data.filter((row) => {
      if (globalSearchFn) return globalSearchFn(row, query);

      return columns
        .filter((column) => column.searchable !== false)
        .some((column) => {
          const value = column.searchValue
            ? column.searchValue(row)
            : column.accessorKey
              ? row[column.accessorKey]
              : getCellValue(row, column);

          return normalizeSearchText(value).includes(query);
        });
    });
  }, [columns, data, deferredSearch, globalSearchFn, searchMode]);

  const sortedData = useMemo(() => {
    if (!sort) return filteredData;

    const selectedColumn = columns.find((column) => column.id === sort.columnId);
    if (!selectedColumn || selectedColumn.sortable === false) return filteredData;

    return [...filteredData].sort((rowA, rowB) => {
      const valueA =
        typeof selectedColumn.sortAccessor === "function"
          ? selectedColumn.sortAccessor(rowA)
          : selectedColumn.sortAccessor
            ? rowA[selectedColumn.sortAccessor]
            : selectedColumn.accessorKey
              ? rowA[selectedColumn.accessorKey]
              : undefined;

      const valueB =
        typeof selectedColumn.sortAccessor === "function"
          ? selectedColumn.sortAccessor(rowB)
          : selectedColumn.sortAccessor
            ? rowB[selectedColumn.sortAccessor]
            : selectedColumn.accessorKey
              ? rowB[selectedColumn.accessorKey]
              : undefined;

      const result = compareValues(valueA, valueB);
      return sort.direction === "asc" ? result : result * -1;
    });
  }, [columns, filteredData, sort]);

  const setSortValue = (nextSort: DataTableSortState) => {
    startTransition(() => {
      if (controlledSort === undefined) {
        setInternalSort(nextSort);
      }
      onSortChange?.(nextSort);
    });
  };

  const handleToggleSort = (columnId: string) => {
    const selectedColumn = columns.find((column) => column.id === columnId);
    if (!selectedColumn || selectedColumn.sortable === false) return;

    if (!sort || sort.columnId !== columnId) {
      return setSortValue({ columnId, direction: "asc" });
    }

    if (sort.direction === "asc") {
      return setSortValue({ columnId, direction: "desc" });
    }

    setSortValue(null);
  };

  const updateSelectedRows = (nextKeys: string[]) => {
    startTransition(() => {
      if (selectedRowKeys === undefined) {
        setInternalSelectedRowKeys(nextKeys);
      }

      const selectedRows = sortedData.filter((row, index) =>
        nextKeys.includes(resolveRowKey(row, index)),
      );

      onSelectedRowKeysChange?.(nextKeys, {
        selectedKeys: nextKeys,
        selectedRows,
      });
    });
  };

  const handleToggleRow = (row: T, index: number) => {
    const key = resolveRowKey(row, index);
    const exists = activeSelectedRowKeys.includes(key);

    updateSelectedRows(
      exists
        ? activeSelectedRowKeys.filter((item) => item !== key)
        : [...activeSelectedRowKeys, key],
    );
  };

  const allVisibleKeys = sortedData.map((row, index) => resolveRowKey(row, index));
  const allSelected =
    selectableRows &&
    allVisibleKeys.length > 0 &&
    allVisibleKeys.every((key) => activeSelectedRowKeys.includes(key));

  const someSelected =
    selectableRows &&
    !allSelected &&
    allVisibleKeys.some((key) => activeSelectedRowKeys.includes(key));

  const handleToggleAllRows = () => {
    if (!selectableRows) return;

    if (allSelected) {
      return updateSelectedRows(
        activeSelectedRowKeys.filter((key) => !allVisibleKeys.includes(key)),
      );
    }

    updateSelectedRows(Array.from(new Set([...activeSelectedRowKeys, ...allVisibleKeys])));
  };

  const isRowClickable = !!onRowClick && rowClickable !== false;
  const shouldRenderCards =
    responsiveCards &&
    (responsiveMode === "cards" || (responsiveMode === "auto" && isMobile));
  const shouldRenderTable =
    responsiveMode !== "cards" &&
    (!responsiveCards || responsiveMode === "table" || !isMobile);
  const enableRowAnimations = animated && sortedData.length <= animateRowsThreshold;
  const showSkeletonLoading = loading && sortedData.length === 0;
  const resolvedRangeDates = rangeDates
    ? {
      ...rangeDates,
      name: rangeDates.name ?? `data-table:${tableId}:rangeDates`,
      label: rangeDates.label ?? "Rango de fechas",
    }
    : undefined;

  return (
    <div className={cn("w-full", className)}>
      <DataTableToolbar
        showSearch={showSearch}
        customSearchContent={toolbarSearchContent}
        searchValue={activeSearch}
        searchPlaceholder={searchPlaceholder}
        onSearchChange={(value) => {
          if (controlledSearch) return onSearchChange?.(value);
          setInternalSearch(value);
        }}
        filtersConfig={filtersConfig}
        rangeDates={resolvedRangeDates}
        selectionInfo={
          selectableRows ? (
            <div className="inline-flex items-center gap-2 rounded-sm border border-border/70 bg-background px-3 py-2 text-sm text-muted-foreground shadow-sm">
              <CheckSquare className="h-4 w-4" />
              {activeSelectedRowKeys.length} fila(s) seleccionada(s)
            </div>
          ) : null
        }
        rightContent={
          canManageColumns ? (
            <DataTableColumnManager
              columns={orderedColumns.map((column) => ({
                id: column.id,
                header: column.header,
                hideable: column.hideable,
                pinned: column.pinned,
                lockPosition: column.lockPosition,
              }))}
              visibleColumnIds={columnPreferences.visibleColumnIds}
              orderedColumnIds={columnPreferences.orderedColumnIds}
              onToggle={toggleColumn}
              onMove={moveColumn}
              onReset={resetColumns}
            />
          ) : null
        }
      />

      {shouldRenderCards ? (
        <DataTableResponsiveCards
          data={sortedData}
          columns={visibleColumns}
          loading={loading}
          emptyMessage={emptyMessage}
          animated={enableRowAnimations}
          visibleOnDesktop={responsiveMode === "cards"}
          rowClickable={isRowClickable}
          onRowClick={onRowClick}
          rowClassName={rowClassName}
          resolveRowKey={resolveRowKey}
        />
      ) : null}

      {shouldRenderTable ? (
        <div className="relative rounded-sm border border-border/70 bg-background shadow-sm">
          {loading && !showSkeletonLoading ? (
            <div className="pointer-events-none absolute right-3 top-3 z-20 inline-flex items-center rounded-full border border-border/70 bg-background/95 px-2.5 py-1 text-[11px] font-medium text-muted-foreground shadow-sm backdrop-blur">
              Actualizando...
            </div>
          ) : null}

          <div className="scrollbar-panel max-h-[90vh] overflow-auto rounded-sm">
            <table className={cn("w-full min-w-full text-xs", tableClassName)}>
              <thead
                className={cn(
                  stickyHeader && "sticky top-0 z-10 bg-background/95 backdrop-blur",
                )}
              >
                <tr className="border-b border-border/70 bg-muted/40">
                  {selectableRows ? (
                    <th className="w-12 px-4 py-3 text-left">
                      <button
                        type="button"
                        onClick={handleToggleAllRows}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border/70 bg-background transition hover:bg-muted"
                      >
                        {allSelected ? (
                          <CheckSquare className="h-4 w-4" />
                        ) : someSelected ? (
                          <MinusSquare className="h-4 w-4" />
                        ) : (
                          <Square className="h-4 w-4" />
                        )}
                      </button>
                    </th>
                  ) : null}

                  {visibleColumns.map((column) => {
                    const isSorted = sort?.columnId === column.id;
                    const canSort =
                      column.sortable !== false &&
                      (!!column.accessorKey || !!column.sortAccessor);

                    return (
                      <th
                        key={column.id}
                        style={column.width ? { width: column.width } : undefined}
                        className={cn(
                          "px-2.5 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground",
                          column.headerClassName,
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <span>{column.header}</span>

                          {canSort ? (
                            <button
                              type="button"
                              onClick={() => handleToggleSort(column.id)}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-background hover:text-foreground"
                            >
                              {isSorted ? (
                                sort?.direction === "asc" ? (
                                  <ArrowUp className="h-4 w-4" />
                                ) : (
                                  <ArrowDown className="h-4 w-4" />
                                )
                              ) : (
                                <ArrowUpDown className="h-4 w-4" />
                              )}
                            </button>
                          ) : null}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>

              <tbody>
                {showSkeletonLoading ? (
                  Array.from({ length: 5 }).map((_, rowIndex) => (
                    <tr key={rowIndex} className="border-b border-border/50">
                      {selectableRows ? (
                        <td className="px-4 py-4">
                          <div className="h-4 w-4 animate-pulse rounded bg-muted" />
                        </td>
                      ) : null}

                      {visibleColumns.map((column) => (
                        <td key={column.id} className="px-4 py-4">
                          <div className="h-4 w-full animate-pulse rounded bg-muted" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : sortedData.length === 0 ? (
                  <tr>
                    <td
                      colSpan={visibleColumns.length + (selectableRows ? 1 : 0) || 1}
                      className="px-4 py-12 text-center text-sm text-muted-foreground"
                    >
                      {emptyMessage}
                    </td>
                  </tr>
                ) : (
                  sortedData.map((row, index) => {
                    const rowClasses = cn(
                      "border-b border-border/50 transition-colors",
                      hoverable && "hover:bg-muted/30",
                      striped && index % 2 !== 0 && "bg-muted/[0.16]",
                      isRowClickable && "cursor-pointer",
                      rowClassName?.(row, index),
                    );

                    const motionProps = enableRowAnimations
                      ? {
                        initial: { opacity: 0, y: 8 },
                        animate: { opacity: 1, y: 0 },
                        transition: { duration: 0.2, delay: index * 0.03 },
                      }
                      : {};

                    const rowKeyValue = resolveRowKey(row, index);
                    const isSelected = activeSelectedRowKeys.includes(rowKeyValue);

                    const rowCells = (
                      <>
                        {selectableRows ? (
                          <td
                            className="px-2.5 py-2"
                            onClick={(event) => event.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => handleToggleRow(row, index)}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border/70 bg-background transition hover:bg-muted"
                            >
                              {isSelected ? (
                                <CheckSquare className="h-4 w-4" />
                              ) : (
                                <Square className="h-4 w-4" />
                              )}
                            </button>
                          </td>
                        ) : null}

                        {visibleColumns.map((column) => {
                          const isCellClickable =
                            !!column.onCellClick && column.clickable !== false;
                          const shouldStopRowClick =
                            column.stopRowClick || isCellClickable;

                          return (
                            <td
                              key={column.id}
                              onClick={
                                shouldStopRowClick
                                  ? (event) => {
                                    event.stopPropagation();
                                    if (isCellClickable) {
                                      column.onCellClick?.(row, index, event);
                                    }
                                  }
                                  : undefined
                              }
                              className={cn(
                                "px-2 py-1 align-middle text-foregroun",
                                column.className,
                                isCellClickable && "cursor-pointer hover:underline",
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
                      </>
                    );

                    if (enableRowAnimations) {
                      return (
                        <motion.tr
                          key={rowKeyValue}
                          {...motionProps}
                          onClick={
                            isRowClickable ? () => onRowClick?.(row, index) : undefined
                          }
                          className={cn(rowClasses, isSelected && "bg-primary/5")}
                        >
                          {rowCells}
                        </motion.tr>
                      );
                    }

                    return (
                      <tr
                        key={rowKeyValue}
                        onClick={
                          isRowClickable ? () => onRowClick?.(row, index) : undefined
                        }
                        className={cn(rowClasses, isSelected && "bg-primary/5")}
                      >
                        {rowCells}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {pagination && onPageChange && pagination.total > pagination.limit ? (
        <div className="flex flex-col gap-3 py-3 sm:items-end sm:justify-between">
          <DataTablePagination
            page={pagination.page}
            limit={pagination.limit}
            total={pagination.total}
            onPageChange={onPageChange}
          />
        </div>
      ) : null}
    </div>
  );
}
