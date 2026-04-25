import { CalendarClock } from "lucide-react";
import { useEffect, useId, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { SystemButton } from "@/components/SystemButton";
import { CalendarPanel } from "./CalendarPanel";
import { DatePickerPanelPortal } from "./DatePickerPanelPortal";
import { formatDateTime, setTimeParts } from "./dateUtils";
import { useFloatingDatePanel } from "./useFloatingDatePanel";

type AnimatedDateTimePickerProps = {
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
  collapsedWidth?: number;
  expandedWidth?: number;
};

export function AnimatedDateTimePicker({
  label,
  name,
  value,
  onChange,
  error,
  placeholder = "Seleccionar fecha y hora",
  disabled = false,
  readOnly = false,
  className,
  containerClassName,
  minDate,
  maxDate,
  disablePast,
  disableFuture,
  clearable = true,
  collapsedWidth = 42,
  expandedWidth = 280,
}: AnimatedDateTimePickerProps) {
  const [monthDate, setMonthDate] = useState<Date>(value ?? new Date());
  const [draftDate, setDraftDate] = useState<Date>(value ?? new Date());
  const [expanded, setExpanded] = useState(Boolean(value));

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
    preferredHeight: 420,
  });

  const displayValue = useMemo(() => formatDateTime(value), [value]);
  const hasValue = displayValue.trim().length > 0;

  useEffect(() => {
    if (open) {
      const base = value ?? new Date();
      setMonthDate(base);
      setDraftDate(base);
      setExpanded(true);
    }
  }, [open, value]);

  const handleClose = () => {
    closePanel();
    if (!hasValue) {
      setExpanded(false);
    }
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
            setExpanded(true);
            togglePanel();
          }}
          style={{ width: expanded || hasValue ? expandedWidth : collapsedWidth }}
          className={cn(
            "peer relative flex h-10 items-center gap-2 overflow-hidden rounded-lg border bg-background px-3 text-left text-sm text-foreground outline-none transition-all",
            error
              ? "border-red-500 ring-2 ring-red-200/40"
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
          <CalendarClock className="h-4 w-4 shrink-0 text-muted-foreground" />

          {(expanded || hasValue) ? (
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
                    setExpanded(true);
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
                      handleClose();
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
                  setExpanded(true);
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
