import { Fragment, type ReactNode } from "react";
import {
  flexRender,
  type Cell,
  type Header,
  type Row,
  type Table,
} from "@tanstack/react-table";

type DataTableProps<TData> = {
  table: Table<TData>;
  loading?: boolean;
  error?: string | null;
  emptyMessage?: string;
  renderExpandedRow?: (row: Row<TData>) => ReactNode;
  headerCellClassName?: (header: Header<TData, unknown>) => string;
  bodyCellClassName?: (cell: Cell<TData, unknown>) => string;
  containerClassName?: string;
  tableClassName?: string;
};

export function DataTable<TData>({
  table,
  loading = false,
  error,
  emptyMessage = "No hay registros.",
  renderExpandedRow,
  headerCellClassName,
  bodyCellClassName,
  containerClassName,
  tableClassName,
}: DataTableProps<TData>) {
  const rows = table.getRowModel().rows;

  return (
    <div
      className={
        containerClassName ??
        "max-h-[calc(100vh-238px)] min-h-[calc(100vh-238px)] overflow-auto"
      }
    >
      <table className={tableClassName ?? "w-full table-fixed"}>
        <thead className="sticky top-0 z-10 bg-gray-50">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr
              key={headerGroup.id}
              className="border-b border-black/10 text-[11px] text-black/60"
            >
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className={
                    headerCellClassName
                      ? headerCellClassName(header)
                      : "px-5 py-3 text-left"
                  }
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>

        <tbody>
          {rows.map((row) => (
            <Fragment key={row.id}>
              <tr className="border-b border-black/5 text-[11px]">
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    className={
                      bodyCellClassName
                        ? bodyCellClassName(cell)
                        : "px-5 py-3 align-middle"
                    }
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>

              {row.getIsExpanded() && renderExpandedRow && (
                <tr className="border-b border-black/5 bg-black/[0.015]">
                  <td colSpan={row.getVisibleCells().length} className="px-5 py-4">
                    {renderExpandedRow(row)}
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>

      {!loading && rows.length === 0 && (
        <div className="px-5 py-8 text-sm text-black/60">{emptyMessage}</div>
      )}

      {error && <div className="px-5 py-4 text-sm text-rose-600">{error}</div>}
    </div>
  );
}