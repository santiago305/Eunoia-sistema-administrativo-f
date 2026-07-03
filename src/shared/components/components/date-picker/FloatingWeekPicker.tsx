import { CalendarRange } from "lucide-react";
import { useEffect, useId, useMemo, useState } from "react";
import { cn } from "@/shared/lib/utils";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { CalendarPanel } from "./CalendarPanel";
import { DatePickerPanelPortal } from "./DatePickerPanelPortal";
import {
  endOfCalendarWeek,
  formatCalendarWeek,
  normalizeCalendarWeekValue,
  parseDateOnly,
} from "./dateUtils";
import { useFloatingDatePanel } from "./useFloatingDatePanel";

type FloatingWeekPickerProps = {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  className?: string;
  containerClassName?: string;
  min?: string;
  max?: string;
  clearable?: boolean;
};

export function FloatingWeekPicker({
  label,
  name,
  value,
  onChange,
  error,
  placeholder = "Seleccionar",
  disabled = false,
  readOnly = false,
  className,
  containerClassName,
  min,
  max,
  clearable = true,
}: FloatingWeekPickerProps) {
  const normalizedValue = useMemo(
    () => normalizeCalendarWeekValue(value),
    [value],
  );
  const selectedMonday = useMemo(
    () => parseDateOnly(normalizedValue),
    [normalizedValue],
  );
  const selectedSunday = useMemo(
    () =>
      selectedMonday
        ? endOfCalendarWeek(selectedMonday)
        : null,
    [selectedMonday],
  );
  const minDate = useMemo(() => parseDateOnly(min), [min]);
  const maxDate = useMemo(() => parseDateOnly(max), [max]);
  const [monthDate, setMonthDate] = useState<Date>(
    selectedMonday ?? new Date(),
  );

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
    togglePanel,
    closePanel,
  } = useFloatingDatePanel({
    disabled,
    readOnly,
    panelMinWidth: 320,
    preferredHeight: 390,
  });

  useEffect(() => {
    if (!open) return;
    setMonthDate(selectedMonday ?? new Date());
  }, [open, selectedMonday]);

  const displayValue = formatCalendarWeek(normalizedValue);
  const hasValue = Boolean(displayValue);

  return (
    <div ref={rootRef} className={cn("w-full", containerClassName)}>
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
            "peer relative flex h-10 w-full items-center justify-between rounded-lg border bg-background px-3 py-2 text-left text-sm text-foreground outline-none transition-all",
            error
              ? "border-red-500 focus-visible:border-red-500 focus-visible:ring-2 focus-visible:ring-red-200/40"
              : open
                ? "border-primary ring-2 ring-primary/30"
                : "border-border focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30",
            disabled &&
              "cursor-not-allowed border-border/70 bg-muted text-muted-foreground",
            readOnly && "cursor-default bg-muted/40 text-foreground",
            className,
          )}
          aria-expanded={open}
          aria-haspopup="dialog"
          aria-controls={open ? panelId : undefined}
          aria-describedby={error ? errorId : undefined}
          aria-labelledby={labelId}
          aria-invalid={Boolean(error)}
        >
          <span
            className={cn(
              "min-w-0 flex-1 truncate pr-2",
              hasValue
                ? "text-foreground"
                : "text-muted-foreground",
            )}
          >
            {displayValue || placeholder}
          </span>

          <CalendarRange
            className="h-4 w-4 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
        </button>

        <label
          id={labelId}
          htmlFor={name}
          className={cn(
            "pointer-events-none absolute left-3 px-1 text-xs transition-all duration-200",
            disabled
              ? "bg-muted"
              : readOnly
                ? "bg-muted/40"
                : "bg-background",
            hasValue || open
              ? "top-0 -translate-y-1/2 text-[11px]"
              : "top-1/2 -translate-y-1/2",
            disabled
              ? "text-muted-foreground/80"
              : readOnly
                ? "text-muted-foreground"
                : error
                  ? "text-red-500"
                  : open
                    ? "text-primary"
                    : "text-muted-foreground",
          )}
        >
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
        <div role="dialog" aria-label={`Seleccionar ${label.toLowerCase()}`}>
          <CalendarPanel
            mode="week"
            monthDate={monthDate}
            onMonthDateChange={setMonthDate}
            rangeStart={selectedMonday}
            rangeEnd={selectedSunday}
            onSelectDate={(date) => {
              onChange(normalizeCalendarWeekValue(
                `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
                  2,
                  "0",
                )}-${String(date.getDate()).padStart(2, "0")}`,
              ));
              closePanel();
            }}
            minDate={minDate ?? undefined}
            maxDate={maxDate ?? undefined}
            footer={
              clearable && hasValue ? (
                <div className="flex justify-end">
                  <SystemButton
                    type="button"
                    variant="ghost"
                    size="custom"
                    aria-label={`Limpiar ${label.toLowerCase()}`}
                    onClick={() => {
                      onChange("");
                      closePanel();
                    }}
                    className="h-9 rounded-lg px-3 text-xs text-muted-foreground hover:text-foreground"
                  >
                    Limpiar
                  </SystemButton>
                </div>
              ) : null
            }
          />
        </div>
      </DatePickerPanelPortal>
    </div>
  );
}
