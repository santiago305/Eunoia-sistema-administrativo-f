import { FloatingInput } from "@/components/FloatingInput";
import { FloatingDateRangePicker } from "@/components/date-picker/FloatingDateRangePicker";
import { Popover } from "@/components/modales/Popover";
import {   ListFilter, Search, X } from "lucide-react";
import { useRef, useState, type ReactNode } from "react";
import type { DataTableRangeDates } from "./types";

type Props = {
  showSearch?: boolean;
  searchValue: string;
  searchPlaceholder: string;
  onSearchChange: (value: string) => void;
  filters?: ReactNode;
  filterPopoverContent?: ReactNode;
  rangeDates?: DataTableRangeDates;
  rightContent?: ReactNode;
  selectionInfo?: ReactNode;
};

export function DataTableToolbar({
  showSearch,
  searchValue,
  searchPlaceholder,
  onSearchChange,
  filters,
  filterPopoverContent,
  rangeDates,
  rightContent,
  selectionInfo,
}: Props) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filtersAnchorRef = useRef<HTMLButtonElement | null>(null);

  if (
    !showSearch &&
    !filters &&
    !filterPopoverContent &&
    !rangeDates &&
    !rightContent &&
    !selectionInfo
  ) {
    return null;
  }

  return (
    <div className="relative z-30 mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center">
        {showSearch || filters || filterPopoverContent || rangeDates ? (
          <div className="flex w-full min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            {showSearch ? (
              <div className="relative w-full max-w-md">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                <FloatingInput
                  label={searchPlaceholder}
                  name="datatable-search"
                  value={searchValue}
                  onChange={(event) => onSearchChange(event.target.value)}
                  className="h-11 rounded-sm border-border pl-4 pr-10 shadow-sm"
                />

                {searchValue ? (
                  <button
                    type="button"
                    onClick={() => onSearchChange("")}
                    className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-xl text-muted-foreground transition hover:bg-muted hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
            ) : null}

            {rangeDates ? (
              <div className="w-full sm:w-[min(22rem,calc(100vw-2rem))]">
                <FloatingDateRangePicker
                  label={rangeDates.label ?? "rangeDates"}
                  name={rangeDates.name ?? "datatable-rangeDates"}
                  startDate={rangeDates.startDate}
                  endDate={rangeDates.endDate}
                  onChange={rangeDates.onChange}
                  disabled={rangeDates.disabled}
                  className="h-11 rounded-md border-border/70 px-3 text-xs shadow-sm"
                />
              </div>
            ) : null}

            {filterPopoverContent ? (
              <>
                <button
                  ref={filtersAnchorRef}
                  type="button"
                  aria-expanded={filtersOpen}
                  aria-haspopup="dialog"
                  onClick={() => setFiltersOpen((current) => !current)}
                  className="inline-flex h-11 items-center gap-2 rounded-md border border-border/70 bg-background px-4 text-xs font-medium shadow-sm transition hover:bg-muted/50"
                >
                  <ListFilter className="h-4 w-4"/>
                </button>

                <Popover
                  open={filtersOpen}
                  onClose={() => setFiltersOpen(false)}
                  anchorRef={filtersAnchorRef}
                  placement="bottom-end"
                  offset={12}
                  animation="scale"
                  title="Filtros"
                  bodyClassName="w-[min(56rem,calc(100vw-2rem))] p-3"
                  className="border-border/70 bg-background/95 shadow-2xl backdrop-blur-xl"
                >
                  {filterPopoverContent}
                </Popover>
              </>
            ) : null}

            {filters ? (
              <div className="flex flex-wrap items-center gap-2">{filters}</div>
            ) : null}
          </div>
        ) : null}

        {selectionInfo}
      </div>

      {rightContent ? <div className="flex items-center justify-end">{rightContent}</div> : null}
    </div>
  );
}
