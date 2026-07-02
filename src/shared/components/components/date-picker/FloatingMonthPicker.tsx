import {
  Calendar,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useEffect, useId, useMemo, useState } from "react";
import { cn } from "@/shared/lib/utils";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { DatePickerPanelPortal } from "./DatePickerPanelPortal";
import { useFloatingDatePanel } from "./useFloatingDatePanel";

type FloatingMonthPickerProps = {
  label: string;
  ariaLabel?: string;
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

type MonthValue = {
  year: number;
  month: number;
};

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, index) => ({
  month: index + 1,
  label: new Intl.DateTimeFormat("es-PE", {
    month: "long",
  }).format(new Date(2020, index, 1)),
}));

function parseMonthValue(value?: string): MonthValue | null {
  const match = /^(\d{4})-(\d{2})$/.exec(value ?? "");

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);

  if (month < 1 || month > 12) {
    return null;
  }

  return { year, month };
}

function toMonthValue(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function toMonthIndex(value: MonthValue) {
  return value.year * 12 + value.month - 1;
}

function formatMonth(value: string) {
  if (!value) {
    return "";
  }

  const parsedValue = parseMonthValue(value);

  if (!parsedValue) {
    return value;
  }

  return new Intl.DateTimeFormat("es-PE", {
    month: "short",
    year: "numeric",
  }).format(new Date(parsedValue.year, parsedValue.month - 1, 1));
}

export function FloatingMonthPicker({
  label,
  ariaLabel,
  name,
  value,
  onChange,
  error,
  placeholder,
  disabled = false,
  readOnly = false,
  className,
  containerClassName,
  min,
  max,
  clearable = true,
}: FloatingMonthPickerProps) {
  const labelId = useId();
  const panelId = useId();
  const errorId = useId();

  const selectedMonth = useMemo(() => parseMonthValue(value), [value]);
  const minMonth = useMemo(() => parseMonthValue(min), [min]);
  const maxMonth = useMemo(() => parseMonthValue(max), [max]);

  const [visibleYear, setVisibleYear] = useState(
    selectedMonth?.year ?? new Date().getFullYear(),
  );

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
    panelMinWidth: 300,
    preferredHeight: 310,
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    setVisibleYear(selectedMonth?.year ?? new Date().getFullYear());
  }, [open, selectedMonth]);

  const hasValue = value.trim().length > 0;
  const displayValue = formatMonth(value);

  const isMonthDisabled = (year: number, month: number) => {
    const candidate = toMonthIndex({ year, month });

    return (
      (minMonth ? candidate < toMonthIndex(minMonth) : false) ||
      (maxMonth ? candidate > toMonthIndex(maxMonth) : false)
    );
  };

  const canShowYear = (year: number) =>
    (!minMonth || year >= minMonth.year) &&
    (!maxMonth || year <= maxMonth.year);

  return (
    <div
      ref={rootRef}
      className={cn("w-full", containerClassName)}
    >
      <div className="relative">
        <button
          ref={triggerRef}
          type="button"
          id={name}
          name={name}
          disabled={disabled}
          onClick={() => {
            if (!canOpen) {
              return;
            }

            togglePanel();
          }}
          className={cn(
            "relative flex h-10 w-full cursor-pointer items-center justify-between rounded-lg border bg-background px-3 py-2 text-left text-xs text-foreground outline-none transition-all",
            error
              ? "border-red-500 focus-visible:border-red-500 focus-visible:ring-2 focus-visible:ring-red-200/40"
              : open
                ? "border-primary ring-2 ring-primary/30"
                : "border-border focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30",
            disabled &&
              "cursor-not-allowed border-border/70 bg-muted text-muted-foreground",
            readOnly &&
              "cursor-default bg-muted/40 text-foreground",
            className,
          )}
          aria-label={ariaLabel ?? label}
          aria-expanded={open}
          aria-haspopup="dialog"
          aria-controls={open ? panelId : undefined}
          aria-describedby={error ? errorId : undefined}
          aria-invalid={Boolean(error)}
        >
          <span
            className={cn(
              "min-w-0 flex-1 truncate pr-2 pt-1",
              hasValue
                ? "text-foreground"
                : "text-muted-foreground",
            )}
          >
            {displayValue || placeholder || "Todos"}
          </span>

          <Calendar
            className="h-4 w-4 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
        </button>

        <label
          id={labelId}
          htmlFor={name}
          className={cn(
            "pointer-events-none absolute left-3 top-0 -translate-y-1/2 bg-background px-1 text-[11px] transition-all duration-200",
            disabled
              ? "bg-muted text-muted-foreground/80"
              : readOnly
                ? "bg-muted/40 text-muted-foreground"
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
        <div
          role="dialog"
          aria-label={`Seleccionar ${label.toLowerCase()}`}
          className="w-full overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-floating-panel"
        >
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <SystemButton
              type="button"
              variant="ghost"
              size="custom"
              disabled={!canShowYear(visibleYear - 1)}
              aria-label="Año anterior"
              onClick={() =>
                setVisibleYear((current) => current - 1)
              }
              className="h-10 w-10 rounded-lg p-0 text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
            </SystemButton>

            <div className="text-center">
              <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                Seleccionar mes
              </p>
              <p
                className="mt-0.5 text-sm font-semibold tabular-nums text-foreground"
                aria-live="polite"
              >
                {visibleYear}
              </p>
            </div>

            <SystemButton
              type="button"
              variant="ghost"
              size="custom"
              disabled={!canShowYear(visibleYear + 1)}
              aria-label="Año siguiente"
              onClick={() =>
                setVisibleYear((current) => current + 1)
              }
              className="h-10 w-10 rounded-lg p-0 text-muted-foreground hover:text-foreground"
            >
              <ChevronRight className="h-4 w-4" />
            </SystemButton>
          </div>

          <div className="grid grid-cols-3 gap-2 p-3">
            {MONTH_OPTIONS.map((option) => {
              const selected =
                selectedMonth?.year === visibleYear &&
                selectedMonth.month === option.month;
              const unavailable = isMonthDisabled(
                visibleYear,
                option.month,
              );

              return (
                <button
                  key={option.month}
                  type="button"
                  disabled={unavailable}
                  aria-pressed={selected}
                  onClick={() => {
                    onChange(
                      toMonthValue(visibleYear, option.month),
                    );
                    closePanel();
                  }}
                  className={cn(
                    "h-10 rounded-lg px-2 text-sm capitalize outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary/40",
                    selected
                      ? "bg-primary font-medium text-primary-foreground shadow-sm"
                      : "text-foreground hover:bg-muted",
                    unavailable &&
                      "cursor-not-allowed text-muted-foreground opacity-40 hover:bg-transparent",
                  )}
                >
                  {option.label}
                </button>
              );
            })}
          </div>

          {clearable && hasValue ? (
            <div className="flex justify-end border-t border-border px-3 py-2">
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
          ) : null}
        </div>
      </DatePickerPanelPortal>
    </div>
  );
}
