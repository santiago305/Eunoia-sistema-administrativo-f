import { motion } from "framer-motion";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
  WEEKDAY_LABELS,
  addMonths,
  buildTimeOptions,
  formatDate,
  getHours,
  getMinutes,
  getMonthGrid,
  getMonthLabel,
  getMonthTitle,
  isBeforeDay,
  isDateDisabled,
  isSameDay,
  isWithinInclusiveRange,
  setTimeParts,
} from "./dateUtils";

type CalendarMode = "single" | "range" | "datetime";
type CalendarView = "day" | "month" | "year";

type CalendarPanelProps = {
  mode: CalendarMode;
  monthDate: Date;
  onMonthDateChange: (date: Date) => void;
  selectedDate?: Date | null;
  rangeStart?: Date | null;
  rangeEnd?: Date | null;
  hoverDate?: Date | null;
  onHoverDateChange?: (date: Date | null) => void;
  onSelectDate: (date: Date) => void;
  minDate?: Date;
  maxDate?: Date;
  disablePast?: boolean;
  disableFuture?: boolean;
  showTimeControls?: boolean;
  timeValue?: Date | null;
  onTimeChange?: (date: Date) => void;
  footer?: React.ReactNode;
  className?: string;
};

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, index) => ({
  value: index,
  label: getMonthLabel(index),
}));

function getYearRange(centerYear: number, size = 12) {
  const start = centerYear - Math.floor(size / 2);
  return Array.from({ length: size }, (_, index) => start + index);
}

export function CalendarPanel({
  mode,
  monthDate,
  onMonthDateChange,
  selectedDate,
  rangeStart,
  rangeEnd,
  hoverDate,
  onHoverDateChange,
  onSelectDate,
  minDate,
  maxDate,
  disablePast,
  disableFuture,
  showTimeControls = false,
  timeValue,
  onTimeChange,
  footer,
  className,
}: CalendarPanelProps) {
  const [view, setView] = useState<CalendarView>("day");
  const [yearPage, setYearPage] = useState(monthDate.getFullYear());

  const days = getMonthGrid(monthDate);
  const hourOptions = buildTimeOptions(24);
  const minuteOptions = buildTimeOptions(60);

  const previewRangeStart =
    mode === "range" && rangeStart && !rangeEnd ? rangeStart : undefined;
  const previewRangeEnd =
    mode === "range" &&
    rangeStart &&
    !rangeEnd &&
    hoverDate &&
    !isBeforeDay(hoverDate, rangeStart)
      ? hoverDate
      : undefined;

  const visibleYears = useMemo(() => getYearRange(yearPage, 12), [yearPage]);

  const selectedMonthForHighlight =
    selectedDate?.getMonth() ??
    rangeStart?.getMonth() ??
    monthDate.getMonth();

  const selectedYearForHighlight =
    selectedDate?.getFullYear() ??
    rangeStart?.getFullYear() ??
    monthDate.getFullYear();

  const handleHeaderTitleClick = () => {
    if (view === "day") {
      setView("month");
      return;
    }

    if (view === "month") {
      setYearPage(monthDate.getFullYear());
      setView("year");
      return;
    }
  };

  const handlePrevious = () => {
    if (view === "day") {
      onMonthDateChange(addMonths(monthDate, -1));
      return;
    }

    if (view === "month") {
      onMonthDateChange(new Date(monthDate.getFullYear() - 1, monthDate.getMonth(), 1));
      return;
    }

    setYearPage((current) => current - 12);
  };

  const handleNext = () => {
    if (view === "day") {
      onMonthDateChange(addMonths(monthDate, 1));
      return;
    }

    if (view === "month") {
      onMonthDateChange(new Date(monthDate.getFullYear() + 1, monthDate.getMonth(), 1));
      return;
    }

    setYearPage((current) => current + 12);
  };

  const title =
    view === "day"
      ? getMonthTitle(monthDate)
      : view === "month"
        ? `${monthDate.getFullYear()}`
        : `${visibleYears[0]} - ${visibleYears[visibleYears.length - 1]}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className={cn(
        "w-full overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-floating-panel",
        className,
      )}
    >
      <div className="flex items-center justify-between border-b border-border px-3 py-3">
        <button
          type="button"
          onClick={handlePrevious}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
          aria-label={
            view === "day"
              ? "Mes anterior"
              : view === "month"
                ? "Año anterior"
                : "Años anteriores"
          }
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={handleHeaderTitleClick}
          className="flex items-center gap-2 rounded-md px-2 py-1 text-sm font-semibold text-foreground transition hover:bg-muted"
          aria-label={
            view === "day"
              ? "Cambiar a vista de meses"
              : view === "month"
                ? "Cambiar a vista de años"
                : "Vista de años"
          }
        >
          <CalendarDays className="h-4 w-4" />
          <span>{title}</span>
        </button>

        <button
          type="button"
          onClick={handleNext}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
          aria-label={
            view === "day"
              ? "Mes siguiente"
              : view === "month"
                ? "Año siguiente"
                : "Años siguientes"
          }
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="px-3 py-3">
        {view === "day" ? (
          <>
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

                const isSelectedSingle =
                  mode !== "range" && isSameDay(day.date, selectedDate);

                const isRangeStart = isSameDay(day.date, rangeStart);
                const isRangeEnd = isSameDay(day.date, rangeEnd);

                const isPreviewInRange =
                  previewRangeStart && previewRangeEnd
                    ? isWithinInclusiveRange(day.date, previewRangeStart, previewRangeEnd)
                    : false;

                const isRangeInRange =
                  rangeStart && rangeEnd
                    ? isWithinInclusiveRange(day.date, rangeStart, rangeEnd)
                    : false;

                const isInRange = isRangeInRange || isPreviewInRange;

                return (
                  <button
                    key={day.dateKey}
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      if (disabled) return;
                      onSelectDate(day.date);
                    }}
                    onMouseEnter={() => {
                      if (mode !== "range" || disabled) return;
                      onHoverDateChange?.(day.date);
                    }}
                    onMouseLeave={() => {
                      if (mode !== "range") return;
                      onHoverDateChange?.(null);
                    }}
                    className={cn(
                      "relative flex h-9 items-center justify-center rounded-lg text-sm transition-all",
                      day.isCurrentMonth ? "text-foreground" : "text-muted-foreground/50",
                      disabled && "cursor-not-allowed opacity-40",
                      !disabled && "hover:bg-muted",
                      isInRange && "rounded-none bg-primary/10",
                      (isSelectedSingle || isRangeStart || isRangeEnd) &&
                        "z-10 rounded-lg bg-primary text-primary-foreground hover:bg-primary",
                      day.isToday &&
                        !(isSelectedSingle || isRangeStart || isRangeEnd) &&
                        "border border-primary/40",
                      isRangeStart && "rounded-l-lg",
                      isRangeEnd && "rounded-r-lg",
                    )}
                    aria-pressed={isSelectedSingle || isRangeStart || isRangeEnd}
                  >
                    {day.dayNumber}
                  </button>
                );
              })}
            </div>
          </>
        ) : null}

        {view === "month" ? (
          <div className="grid grid-cols-3 gap-2">
            {MONTH_OPTIONS.map((month) => {
              const isActive =
                month.value === monthDate.getMonth() &&
                monthDate.getFullYear() === selectedYearForHighlight;

              const isSelectedByValue =
                month.value === selectedMonthForHighlight &&
                monthDate.getFullYear() === selectedYearForHighlight;

              return (
                <button
                  key={month.value}
                  type="button"
                  onClick={() => {
                    onMonthDateChange(
                      new Date(monthDate.getFullYear(), month.value, 1),
                    );
                    setView("day");
                  }}
                  className={cn(
                    "flex h-10 items-center justify-center rounded-lg px-2 text-sm transition-all",
                    isActive || isSelectedByValue
                      ? "bg-primary text-primary-foreground"
                      : "text-foreground hover:bg-muted",
                  )}
                >
                  {month.label}
                </button>
              );
            })}
          </div>
        ) : null}

        {view === "year" ? (
          <div className="grid grid-cols-3 gap-2">
            {visibleYears.map((year) => {
              const isSelected = year === selectedYearForHighlight;
              const isCurrentViewYear = year === monthDate.getFullYear();

              return (
                <button
                  key={year}
                  type="button"
                  onClick={() => {
                    onMonthDateChange(new Date(year, monthDate.getMonth(), 1));
                    setView("month");
                  }}
                  className={cn(
                    "flex h-10 items-center justify-center rounded-lg px-2 text-sm transition-all",
                    isSelected || isCurrentViewYear
                      ? "bg-primary text-primary-foreground"
                      : "text-foreground hover:bg-muted",
                  )}
                >
                  {year}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      {showTimeControls ? (
        <div className="border-t border-border px-3 py-3">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            <select
              value={`${getHours(timeValue)}`.padStart(2, "0")}
              onChange={(event) => {
                if (!timeValue || !onTimeChange) return;
                onTimeChange(
                  setTimeParts(timeValue, Number(event.target.value), getMinutes(timeValue)),
                );
              }}
              className="h-9 rounded-md border border-border bg-background px-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
            >
              {hourOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <span className="text-sm text-muted-foreground">:</span>

            <select
              value={`${getMinutes(timeValue)}`.padStart(2, "0")}
              onChange={(event) => {
                if (!timeValue || !onTimeChange) return;
                onTimeChange(
                  setTimeParts(timeValue, getHours(timeValue), Number(event.target.value)),
                );
              }}
              className="h-9 rounded-md border border-border bg-background px-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
            >
              {minuteOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {timeValue ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Seleccionado: {formatDate(timeValue)}
            </p>
          ) : null}
        </div>
      ) : null}

      {footer ? <div className="border-t border-border px-3 py-3">{footer}</div> : null}
    </motion.div>
  );
}
