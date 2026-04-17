import { ChevronRight, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FilterColumnItem } from "./types";

type Props = {
  title?: string;
  items: FilterColumnItem[];
  activeId?: string | null;
  selectedIds?: string[];
  onItemClick: (itemId: string) => void;
  searchable?: boolean;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  emptyMessage?: string;
  className?: string;
  itemClassName?: string;
  showCheckOnSelected?: boolean;
};

export function DataTableFilterColumn({
  title,
  items,
  activeId,
  selectedIds = [],
  onItemClick,
  searchable = false,
  searchValue = "",
  onSearchChange,
  emptyMessage = "Sin resultados",
  className,
  itemClassName,
  showCheckOnSelected = false,
}: Props) {
  return (
    <section
      className={cn(
        "flex min-w-[15rem] max-w-[18rem] flex-1 flex-col border-r border-border/70 bg-background",
        className,
      )}
    >
      {title ? (
        <div className="border-b border-border/70 px-4 py-3">
          <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {title}
          </h3>
        </div>
      ) : null}

      {searchable ? (
        <div className="border-b border-border/70 px-3 py-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={searchValue}
              onChange={(event) => onSearchChange?.(event.target.value)}
              placeholder="Buscar..."
              className="h-9 w-full rounded-md border border-border/70 bg-background pl-9 pr-3 text-xs outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>
      ) : null}

      <div className="scrollbar-panel min-h-0 flex-1 overflow-y-auto p-1.5">
        {items.length === 0 ? (
          <div className="px-3 py-3 text-xs text-muted-foreground">
            {emptyMessage}
          </div>
        ) : (
          items.map((item) => {
            const isActive = activeId === item.id;
            const isSelected = selectedIds.includes(item.id);

            return (
              <button
                key={item.id}
                type="button"
                disabled={item.disabled}
                onClick={() => onItemClick(item.id)}
                className={cn(
                  "flex w-full items-center justify-between gap-3 rounded-md px-3 py-2.5 text-left text-sm transition",
                  item.disabled
                    ? "cursor-not-allowed opacity-50"
                    : "hover:bg-muted/60",
                  isActive
                    ? "bg-primary/10 text-foreground"
                    : "text-foreground",
                  itemClassName,
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{item.label}</div>

                  {typeof item.count === "number" ? (
                    <div className="mt-0.5 text-[11px] text-muted-foreground">
                      {item.count}
                    </div>
                  ) : null}
                </div>

                <div className="flex items-center gap-2">
                  {showCheckOnSelected && isSelected ? (
                    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/12 px-1.5 text-[10px] font-semibold text-primary">
                      ✓
                    </span>
                  ) : null}

                  {item.hasChildren ? (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  ) : null}
                </div>
              </button>
            );
          })
        )}
      </div>
    </section>
  );
}