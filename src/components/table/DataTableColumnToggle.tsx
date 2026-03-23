import { Settings2 } from "lucide-react";
import { useMemo } from "react";

type ToggleColumnItem = {
  id: string;
  header: string;
  hideable?: boolean;
};

type Props = {
  columns: ToggleColumnItem[];
  visibleColumnIds: string[];
  onToggle: (columnId: string) => void;
  onReset: () => void;
};

export function DataTableColumnToggle({
  columns,
  visibleColumnIds,
  onToggle,
  onReset,
}: Props) {
  const hideableColumns = useMemo(
    () => columns.filter((column) => column.hideable !== false),
    [columns],
  );

  return (
    <div className="relative inline-block">
      <details className="group">
        <summary className="list-none">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground shadow-sm transition hover:bg-muted/50"
          >
            <Settings2 className="h-4 w-4" />
            Columnas
          </button>
        </summary>

        <div className="absolute right-0 z-20 mt-2 w-64 rounded-2xl border border-border bg-background p-3 shadow-xl">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-semibold text-foreground">
              Mostrar columnas
            </span>

            <button
              type="button"
              onClick={onReset}
              className="text-xs text-muted-foreground transition hover:text-foreground"
            >
              Restablecer
            </button>
          </div>

          <div className="space-y-2">
            {hideableColumns.map((column) => {
              const checked = visibleColumnIds.includes(column.id);

              return (
                <label
                  key={column.id}
                  className="flex cursor-pointer items-center justify-between rounded-xl px-2 py-2 transition hover:bg-muted/50"
                >
                  <span className="text-sm text-foreground">
                    {column.header}
                  </span>

                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onToggle(column.id)}
                    className="h-4 w-4 rounded border-border"
                  />
                </label>
              );
            })}
          </div>
        </div>
      </details>
    </div>
  );
}