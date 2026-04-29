import { CalendarClock } from "lucide-react";
import { useEffect, useId, useMemo, useState } from "react";
import { cn } from "@/shared/lib/utils";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { CalendarPanel } from "./CalendarPanel";
import { DatePickerPanelPortal } from "./DatePickerPanelPortal";
import { formatDateTime, setTimeParts } from "./dateUtils";
import { useFloatingDatePanel } from "./useFloatingDatePanel";

type FloatingDateTimePickerProps = {
  label: string;
  name: string;
  value?: Date | null;
  onChange: (date: Date | null) => void;
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
};

export function FloatingDateTimePicker({
  label,
  name,
  value,
  onChange,
  error,
  placeholder,
  disabled = false,
  readOnly = false,
  className,
  containerClassName,
  minDate,
  maxDate,
  disablePast,
  disableFuture,
  clearable = true,
}: FloatingDateTimePickerProps) {
  const [monthDate, setMonthDate] = useState<Date>(value ?? new Date());
  const [draftDate, setDraftDate] = useState<Date>(value ?? new Date());

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
    preferredHeight: 420,
  });

  const displayValue = useMemo(() => formatDateTime(value), [value]);
  const hasValue = displayValue.trim().length > 0;

  useEffect(() => {
    if (!open) return;
    const base = value ?? new Date();
    setMonthDate(base);
    setDraftDate(base);
  }, [open, value]);

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
              ? "border-red-500 focus-within:border-red-500 focus-within:ring-2 focus-within:ring-red-200/40"
              : open
                ? "border-primary ring-2 ring-primary/30"
                : "border-border",
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
          <span
            className={cn(
              "truncate pr-2",
              hasValue ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {displayValue || placeholder}
          </span>

          <CalendarClock className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>

        <label
          id={labelId}
          className={cn(
            "pointer-events-none absolute left-3 px-1 text-xs transition-all duration-200",
            disabled ? "bg-muted" : readOnly ? "bg-muted/40" : "bg-background",
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
        <CalendarPanel
          mode="datetime"
          monthDate={monthDate}
          onMonthDateChange={setMonthDate}
          selectedDate={draftDate}
          onSelectDate={(date) => {
            setDraftDate((current) => {
              const source = current ?? new Date();
              return setTimeParts(date, source.getHours(), source.getMinutes());
            });
          }}
          minDate={minDate}
          maxDate={maxDate}
          disablePast={disablePast}
          disableFuture={disableFuture}
          showTimeControls
          timeValue={draftDate}
          onTimeChange={setDraftDate}
          footer={
            <div className="flex items-center justify-between gap-2 [&_button]:h-7 [&_button]:rounded-md [&_button]:px-2.5 [&_button]:text-[11px]">
              <div className="flex items-center gap-2">
                <SystemButton
                  type="button"
                  variant="ghost"
                  size="custom"
                  className="text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    const now = new Date();
                    setDraftDate(now);
                    setMonthDate(now);
                    onChange(now);
                    closePanel();
                  }}
                >
                  Ahora
                </SystemButton>

                {clearable ? (
                  <SystemButton
                    type="button"
                    variant="ghost"
                    size="custom"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      onChange(null);
                      closePanel();
                    }}
                  >
                    Limpiar
                  </SystemButton>
                ) : null}
              </div>

              <SystemButton
                type="button"
                size="custom"
                className="font-semibold"
                onClick={() => {
                  onChange(draftDate);
                  closePanel();
                }}
              >
                Aplicar
              </SystemButton>
            </div>
          }
        />
      </DatePickerPanelPortal>
    </div>
  );
}