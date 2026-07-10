import { CalendarRange, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect, useId, useMemo, useState } from "react";
import { cn } from "@/shared/lib/utils";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { FloatingSelect } from "@/shared/components/components/FloatingSelect";
import { DatePickerPanelPortal } from "./DatePickerPanelPortal";
import {
  addDays,
  addMonths,
  endOfMonth,
  formatRange,
  getMonthGrid,
  getMonthTitle,
  isDateDisabled,
  isBeforeDay,
  isSameDay,
  isWithinInclusiveRange,
  startOfCalendarWeek,
  startOfMonth,
  WEEKDAY_LABELS,
} from "./dateUtils";
import { useFloatingDatePanel } from "./useFloatingDatePanel";

type AnimatedDateRangePickerProps = {
  label: string;
  name: string;
  startDate?: Date | null;
  endDate?: Date | null;
  onChange: (range: { startDate: Date | null; endDate: Date | null }) => void;
  error?: string;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  className?: string;
  containerClassName?: string;
  minDate?: Date;
  maxDate?: Date;
  disablePast?: boolean;
  disableFuture?: boolean;
  clearable?: boolean;
  closeOnComplete?: boolean;
  panelMinWidth?: number;
  fields?: { value: string; label: string }[];
  fieldValue?: string;
  onFieldChange?: (field: string) => void;
};

type RangePreset = {
  label: string;
  getRange: (today: Date) => { startDate: Date; endDate: Date };
};

const RANGE_PRESETS: RangePreset[] = [
  {
    label: "Hoy",
    getRange: (today) => ({ startDate: today, endDate: today }),
  },
  {
    label: "Ayer",
    getRange: (today) => {
      const yesterday = addDays(today, -1);
      return { startDate: yesterday, endDate: yesterday };
    },
  },
  {
    label: "Ultimos 7 dias",
    getRange: (today) => ({ startDate: addDays(today, -6), endDate: today }),
  },
  {
    label: "Ultimos 30 dias",
    getRange: (today) => ({ startDate: addDays(today, -29), endDate: today }),
  },
  {
    label: "Ultimos 90 dias",
    getRange: (today) => ({ startDate: addDays(today, -89), endDate: today }),
  },
  {
    label: "El mes pasado",
    getRange: (today) => {
      const previousMonth = addMonths(startOfMonth(today), -1);
      return {
        startDate: startOfMonth(previousMonth),
        endDate: endOfMonth(previousMonth),
      };
    },
  },
  {
    label: "Desde inicio de semana hasta ahora",
    getRange: (today) => ({
      startDate: startOfCalendarWeek(today),
      endDate: today,
    }),
  },
  {
    label: "Desde inicio de mes hasta ahora",
    getRange: (today) => ({ startDate: startOfMonth(today), endDate: today }),
  },
];

type RangeMonthGridProps = {
  monthDate: Date;
  rangeStart?: Date | null;
  rangeEnd?: Date | null;
  hoverDate?: Date | null;
  onHoverDateChange: (date: Date | null) => void;
  onSelectDate: (date: Date) => void;
  minDate?: Date;
  maxDate?: Date;
  disablePast?: boolean;
  disableFuture?: boolean;
};

function RangeMonthGrid({
  monthDate,
  rangeStart,
  rangeEnd,
  hoverDate,
  onHoverDateChange,
  onSelectDate,
  minDate,
  maxDate,
  disablePast,
  disableFuture,
}: RangeMonthGridProps) {
  const days = useMemo(() => getMonthGrid(monthDate), [monthDate]);
  const previewRangeStart = rangeStart && !rangeEnd && hoverDate
    ? isBeforeDay(hoverDate, rangeStart)
      ? hoverDate
      : rangeStart
    : undefined;
  const previewRangeEnd = rangeStart && !rangeEnd && hoverDate
    ? isBeforeDay(hoverDate, rangeStart)
      ? rangeStart
      : hoverDate
    : undefined;

  return (
    <div className="px-3 pb-3">
      <div className="mb-2 grid grid-cols-7 gap-1">
        {WEEKDAY_LABELS.map((day) => (
          <div
            key={day}
            className="flex h-8 items-center justify-center text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
          >
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const disabled = isDateDisabled(day.date, {
            minDate,
            maxDate,
            disablePast,
            disableFuture,
          });
          const canShowRangeState = day.isCurrentMonth;
          const isRangeStart = canShowRangeState && isSameDay(day.date, rangeStart);
          const isRangeEnd = canShowRangeState && isSameDay(day.date, rangeEnd);
          const isPreviewInRange =
            canShowRangeState && previewRangeStart && previewRangeEnd
              ? isWithinInclusiveRange(day.date, previewRangeStart, previewRangeEnd)
              : false;
          const isRangeInRange =
            canShowRangeState && rangeStart && rangeEnd
              ? isWithinInclusiveRange(day.date, rangeStart, rangeEnd)
              : false;
          const isInRange = isRangeInRange || isPreviewInRange;
          const calendarDayLabel = `${day.dayNumber} ${getMonthTitle(day.date).toLowerCase()}`;

          return (
            <button
              key={day.dateKey}
              type="button"
              disabled={disabled}
              aria-pressed={isRangeStart || isRangeEnd}
              aria-label={calendarDayLabel}
              onClick={() => {
                if (disabled) return;
                onSelectDate(day.date);
              }}
              onMouseEnter={() => {
                if (disabled) return;
                onHoverDateChange(day.date);
              }}
              onMouseLeave={() => onHoverDateChange(null)}
              className={cn(
                "relative flex h-9 items-center justify-center rounded-lg text-sm transition-all",
                day.isCurrentMonth ? "text-foreground" : "text-muted-foreground/50",
                disabled && "cursor-not-allowed opacity-40",
                !disabled && "hover:bg-muted",
                isInRange && "rounded-none bg-primary/10",
                (isRangeStart || isRangeEnd) &&
                  "z-10 rounded-lg bg-primary text-primary-foreground hover:bg-primary",
                day.isToday &&
                  !(isRangeStart || isRangeEnd) &&
                  "border border-primary/40",
                isRangeStart && "rounded-l-lg",
                isRangeEnd && "rounded-r-lg",
              )}
            >
              {day.dayNumber}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function AnimatedDateRangePicker({
  label,
  name,
  startDate,
  endDate,
  onChange,
  error,
  placeholder = "",
  disabled = false,
  readOnly = false,
  className,
  containerClassName,
  minDate,
  maxDate,
  disablePast,
  disableFuture,
  clearable = true,
  closeOnComplete = true,
  panelMinWidth = 760,
  fields,
  fieldValue,
  onFieldChange,
}: AnimatedDateRangePickerProps) {
  const [monthDate, setMonthDate] = useState<Date>(startDate ?? new Date());
  const [hoverDate, setHoverDate] = useState<Date | null>(null);

  const labelId = useId();
  const panelId = useId();
  const errorId = useId();

  const {
    open,
    panelStyle,
    rootRef,
    triggerRef,
    panelRef,
    canOpen,
    closePanel,
    togglePanel,
  } = useFloatingDatePanel({
    disabled,
    readOnly,
    panelMinWidth,
    preferredHeight: 430,
  });

  const displayValue = useMemo(
    () => formatRange(startDate, endDate),
    [startDate, endDate],
  );
  const hasValue = displayValue.trim().length > 0;

  useEffect(() => {
    if (open) {
      setMonthDate(startDate ?? new Date());
    }
  }, [open, startDate]);

  const handleClose = () => {
    closePanel();
    setHoverDate(null);
  };

  const handleSelectDate = (date: Date) => {
    if (!startDate || (startDate && endDate)) {
      onChange({ startDate: date, endDate: null });
      return;
    }

    if (isBeforeDay(date, startDate)) {
      onChange({ startDate: date, endDate: startDate });
      if (closeOnComplete) {
        closePanel();
      }
      return;
    }

    onChange({ startDate, endDate: date });
    if (closeOnComplete) {
      closePanel();
    }
  };

  const handlePresetClick = (preset: RangePreset) => {
    const today = new Date();
    const nextRange = preset.getRange(today);
    onChange(nextRange);
    setMonthDate(nextRange.startDate);
    closePanel();
  };

  return (
    <div ref={rootRef} className={cn("w-fit", containerClassName)}>
      <div className="relative">
        <button
          ref={triggerRef}
          type="button"
          id={name}
          name={name}
          disabled={disabled}
          onClick={() => {
            if (!canOpen) return;
            togglePanel();
          }}
          className={cn(
            "peer relative inline-flex h-10 items-center gap-2 overflow-hidden rounded-lg border bg-background px-3 text-left text-sm text-foreground outline-none transition-all",
            error
              ? "border-red-500 ring-2 ring-red-200/40"
              : open
                ? "border-primary ring-2 ring-primary/30"
                : "border-border",
            hasValue ? "justify-start" : "justify-center",
            disabled && "cursor-not-allowed border-border/70 bg-muted text-muted-foreground",
            readOnly && "cursor-default bg-muted/40 text-foreground",
            className,
            hasValue && clearable && !disabled && !readOnly && "pr-8",
          )}
          aria-expanded={open}
          aria-haspopup="dialog"
          aria-controls={open ? panelId : undefined}
          aria-describedby={error ? errorId : undefined}
          aria-labelledby={labelId}
        >
          <CalendarRange className="h-4 w-4 shrink-0 text-muted-foreground" />

          {hasValue ? (
            <span
              className={cn(
                "truncate pr-1",
                hasValue ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {displayValue || placeholder}
            </span>
          ) : null}
        </button>

        {hasValue && clearable && !disabled && !readOnly ? (
          <button
            type="button"
            aria-label={`Limpiar ${label}`}
            className="absolute right-1.5 top-1/2 z-10 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onChange({ startDate: null, endDate: null });
              handleClose();
            }}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}

        <label id={labelId} className="sr-only">
          {label}
        </label>
      </div>

      {error ? (
        <p id={errorId} className="mt-1 text-xs text-red-600">
          {error}
        </p>
      ) : null}

      <DatePickerPanelPortal
        open={open && !disabled}
        panelRef={panelRef}
        panelStyle={panelStyle}
        panelId={panelId}
      >
        <div
          role="dialog"
          aria-label={`${label}: rango de fechas`}
          className="w-full overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-floating-panel"
        >
          <div className="grid gap-0 lg:grid-cols-[220px_minmax(0,1fr)]">
            <aside className="space-y-3 border-b border-border p-3 lg:border-b-0 lg:border-r">
              {fields?.length ? (
                <FloatingSelect
                  label="Campo fecha"
                  name={`${name}-field`}
                  value={fieldValue ?? fields[0]?.value ?? ""}
                  options={fields}
                  onChange={(value) => onFieldChange?.(value)}
                  className="h-9 rounded-md text-xs"
                  panelWidthMode="min-trigger"
                />
              ) : null}

              <div className="space-y-1">
                {RANGE_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => handlePresetClick(preset)}
                    className="flex min-h-8 w-full items-center rounded-md px-2 text-left text-xs text-muted-foreground transition hover:bg-muted hover:text-foreground"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {clearable ? (
                <SystemButton
                  type="button"
                  variant="outline"
                  size="custom"
                  className="h-9 w-full justify-center rounded-md px-3 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    onChange({ startDate: null, endDate: null });
                    handleClose();
                  }}
                >
                  Limpiar
                </SystemButton>
              ) : null}
            </aside>

            <div className="border-border">
              <div className="grid grid-cols-[auto_1fr_auto] items-center border-b border-border px-3 py-3">
                <button
                  type="button"
                  onClick={() => setMonthDate((current) => addMonths(current, -1))}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
                  aria-label="Mes anterior"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                <div className="grid grid-cols-1 gap-2 px-2 text-center text-sm font-semibold text-foreground sm:grid-cols-2">
                  <div>{getMonthTitle(monthDate)}</div>
                  <div>{getMonthTitle(addMonths(monthDate, 1))}</div>
                </div>

                <button
                  type="button"
                  onClick={() => setMonthDate((current) => addMonths(current, 1))}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
                  aria-label="Mes siguiente"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              <div className="grid gap-0 sm:grid-cols-2">
                <RangeMonthGrid
                  monthDate={monthDate}
                  rangeStart={startDate}
                  rangeEnd={endDate}
                  hoverDate={hoverDate}
                  onHoverDateChange={setHoverDate}
                  onSelectDate={handleSelectDate}
                  minDate={minDate}
                  maxDate={maxDate}
                  disablePast={disablePast}
                  disableFuture={disableFuture}
                />

                <div className="border-t border-border sm:border-l sm:border-t-0">
                  <RangeMonthGrid
                    monthDate={addMonths(monthDate, 1)}
                    rangeStart={startDate}
                    rangeEnd={endDate}
                    hoverDate={hoverDate}
                    onHoverDateChange={setHoverDate}
                    onSelectDate={handleSelectDate}
                    minDate={minDate}
                    maxDate={maxDate}
                    disablePast={disablePast}
                    disableFuture={disableFuture}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </DatePickerPanelPortal>
    </div>
  );
}
