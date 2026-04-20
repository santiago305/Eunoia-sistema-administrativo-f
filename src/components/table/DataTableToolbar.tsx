import { FloatingInput } from "@/components/FloatingInput";
import { AnimatedDateRangePicker } from "@/components/date-picker/AnimatedDateRangePicker";
import { DataTableFiltersPopover } from "@/components/table/filters";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {   ListFilter, Search, X } from "lucide-react";
import { useRef, useState, type ReactNode } from "react";
import type { DataTableFiltersConfig, DataTableRangeDates } from "./types";

type Props = {
  showSearch?: boolean;
  customSearchContent?: ReactNode;
  searchValue: string;
  searchPlaceholder: string;
  onSearchChange: (value: string) => void;
  filtersConfig?: DataTableFiltersConfig;
  rangeDates?: DataTableRangeDates;
  rightContent?: ReactNode;
  selectionInfo?: ReactNode;
};

export function DataTableToolbar({
  showSearch,
  customSearchContent,
  searchValue,
  searchPlaceholder,
  onSearchChange,
  filtersConfig,
  rangeDates,
  rightContent,
  selectionInfo,
}: Props) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filtersAnchorRef = useRef<HTMLButtonElement | null>(null);

  if (
    !customSearchContent &&
    !showSearch &&
    !filtersConfig &&
    !rangeDates &&
    !rightContent &&
    !selectionInfo
  ) {
    return null;
  }

  return (
    <div className="relative z-30 mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center">
        {customSearchContent ? (
          <div className="min-w-0 flex-1">{customSearchContent}</div>
        ) : null}

        {showSearch ? (
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
          </div>
        ) : null}

        {selectionInfo}
      </div>

      {rightContent || filtersConfig || rangeDates ? (
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center sm:justify-end">
          {rangeDates ? (
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <div className="flex justify-end">
                  <AnimatedDateRangePicker
                    label={rangeDates.label ?? "rangeDates"}
                    name={rangeDates.name ?? "datatable-rangeDates"}
                    startDate={rangeDates.startDate}
                    endDate={rangeDates.endDate}
                    onChange={rangeDates.onChange}
                    disabled={rangeDates.disabled}
                    className="h-11 rounded-md border-border/70 px-3 text-xs shadow-sm"
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom">Fechas</TooltipContent>
            </Tooltip>
          ) : null}

          {filtersConfig ? (
            <>
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <button
                    ref={filtersAnchorRef}
                    type="button"
                    aria-expanded={filtersOpen}
                    aria-haspopup="dialog"
                    onClick={() => setFiltersOpen((current) => !current)}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-border/70 bg-background text-xs font-medium shadow-sm transition hover:bg-muted/50"
                  >
                    <ListFilter className="h-4 w-4"/>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Filtros</TooltipContent>
              </Tooltip>

              <DataTableFiltersPopover
                open={filtersOpen}
                anchorRef={filtersAnchorRef}
                categories={filtersConfig.categories}
                value={filtersConfig.value}
                onChange={filtersConfig.onChange}
                onClose={() => setFiltersOpen(false)}
                title={filtersConfig.title}
                minWidth={filtersConfig.minWidth}
                maxWidth={filtersConfig.maxWidth}
                emptyMessage={filtersConfig.emptyMessage}
              />
            </>
          ) : null}

          {rightContent ? <div className="flex items-center justify-end">{rightContent}</div> : null}
        </div>
      ) : null}
    </div>
  );
}
