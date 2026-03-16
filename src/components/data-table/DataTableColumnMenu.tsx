import { useEffect, useRef } from "react";
import type { Table } from "@tanstack/react-table";

type Props<TData> = {
  table: Table<TData>;
  open: boolean;
  onToggleOpen: () => void;
  hiddenColumnIds?: string[];
};

export function DataTableColumnMenu<TData>({
  table,
  open,
  onToggleOpen,
  hiddenColumnIds = ["actions", "expander"],
}: Props<TData>) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onToggleOpen();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open, onToggleOpen]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        className="h-10 rounded-lg border border-black/10 bg-white px-3 text-sm hover:bg-black/[0.03]"
        onClick={onToggleOpen}
      >
        Columnas
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-2 min-w-56 rounded-xl border border-black/10 bg-white p-2 shadow-lg">
          {table
            .getAllLeafColumns()
            .filter((column) => !hiddenColumnIds.includes(column.id))
            .map((column) => (
              <label
                key={column.id}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-black/[0.03]"
              >
                <input
                  type="checkbox"
                  checked={column.getIsVisible()}
                  onChange={column.getToggleVisibilityHandler()}
                />
                {String(column.columnDef.header)}
              </label>
            ))}
        </div>
      )}
    </div>
  );
}
