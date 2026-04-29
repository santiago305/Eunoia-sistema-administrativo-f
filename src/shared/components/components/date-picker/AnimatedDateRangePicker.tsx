import { CalendarRange } from "lucide-react";
import { useEffect, useId, useMemo, useState } from "react";
import { cn } from "@/shared/lib/utils";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { CalendarPanel } from "./CalendarPanel";
import { DatePickerPanelPortal } from "./DatePickerPanelPortal";
import { formatRange, isBeforeDay } from "./dateUtils";
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
};

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
    panelMinWidth: 320,
    preferredHeight: 340,
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
        <CalendarPanel
          mode="range"
          monthDate={monthDate}
          onMonthDateChange={setMonthDate}
          rangeStart={startDate}
          rangeEnd={endDate}
          hoverDate={hoverDate}
          onHoverDateChange={setHoverDate}
          onSelectDate={(date) => {
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
          }}
          minDate={minDate}
          maxDate={maxDate}
          disablePast={disablePast}
          disableFuture={disableFuture}
          footer={
            <div className="flex items-center justify-between gap-2 [&_button]:h-7 [&_button]:rounded-md [&_button]:px-2.5 [&_button]:text-[11px]">
              <SystemButton
                type="button"
                variant="ghost"
                size="custom"
                className="text-muted-foreground hover:text-foreground"
                onClick={() => {
                  const today = new Date();
                  onChange({ startDate: today, endDate: today });
                  closePanel();
                }}
              >
                Hoy
              </SystemButton>

              {clearable ? (
                <SystemButton
                  type="button"
                  variant="ghost"
                  size="custom"
                  className="text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    onChange({ startDate: null, endDate: null });
                    handleClose();
                  }}
                >
                  Limpiar
                </SystemButton>
              ) : null}
            </div>
          }
          className="w-full"
        />
      </DatePickerPanelPortal>
    </div>
  );
}
