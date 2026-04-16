import { CalendarClock } from "lucide-react";
import { createPortal } from "react-dom";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { cn } from "@/lib/utils";
import { dispatchCloseAllFloatingSelects } from "@/components/floatingSelectEvents";
import {
  CLOSE_ALL_FLOATING_DATES_EVENT,
  dispatchCloseAllFloatingDates,
} from "@/components/floatingDateEvents";
import { UI_LAYERS } from "@/components/ui/layers";
import { CalendarPanel } from "./CalendarPanel";
import { formatDateTime, setTimeParts } from "./dateUtils";

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
}: FloatingDateTimePickerProps) {
  const [open, setOpen] = useState(false);
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({});
  const [monthDate, setMonthDate] = useState<Date>(value ?? new Date());
  const [draftDate, setDraftDate] = useState<Date>(value ?? new Date());

  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const labelId = useId();
  const panelId = useId();
  const errorId = useId();

  const displayValue = useMemo(() => formatDateTime(value), [value]);
  const hasValue = displayValue.trim().length > 0;
  const canOpen = !disabled && !readOnly;

  const closePanel = useCallback(() => {
    setOpen(false);
  }, []);

  const updatePanelPosition = useCallback(() => {
    const triggerEl = triggerRef.current;
    const panelEl = panelRef.current;

    if (!triggerEl || !panelEl) {
      closePanel();
      return;
    }

    const rect = triggerEl.getBoundingClientRect();
    const spacing = 8;
    const viewportPadding = 8;
    const width = Math.max(rect.width, 320);
    const spaceBelow = window.innerHeight - rect.bottom - spacing - viewportPadding;
    const spaceAbove = rect.top - spacing - viewportPadding;
    const openAbove = spaceBelow < 420 && spaceAbove > spaceBelow;

    const top = openAbove
      ? Math.max(viewportPadding, rect.top - spacing - panelEl.offsetHeight)
      : rect.bottom + spacing;

    const left = Math.min(
      Math.max(viewportPadding, rect.left),
      Math.max(viewportPadding, window.innerWidth - width - viewportPadding),
    );

    setPanelStyle({
      position: "fixed",
      top,
      left,
      width,
      zIndex: UI_LAYERS.floatingSelect,
    });
  }, [closePanel]);

  useEffect(() => {
    const handleOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      if (
        rootRef.current?.contains(target) ||
        panelRef.current?.contains(target)
      ) {
        return;
      }

      closePanel();
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closePanel();
      }
    };

    const handleCloseAllDates = () => {
      closePanel();
    };

    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleEscape);
    window.addEventListener(CLOSE_ALL_FLOATING_DATES_EVENT, handleCloseAllDates);

    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleEscape);
      window.removeEventListener(CLOSE_ALL_FLOATING_DATES_EVENT, handleCloseAllDates);
    };
  }, [closePanel]);

  useEffect(() => {
    if (!open) return;
    const base = value ?? new Date();
    setMonthDate(base);
    setDraftDate(base);
  }, [open, value]);

  useLayoutEffect(() => {
    if (!open) return;

    let raf1 = 0;
    let raf2 = 0;

    raf1 = window.requestAnimationFrame(() => {
      updatePanelPosition();
      raf2 = window.requestAnimationFrame(() => {
        updatePanelPosition();
      });
    });

    return () => {
      window.cancelAnimationFrame(raf1);
      window.cancelAnimationFrame(raf2);
    };
  }, [open, updatePanelPosition]);

  useEffect(() => {
    if (!open) return;

    const handleViewportChange = () => {
      updatePanelPosition();
    };

    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);

    return () => {
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [open, updatePanelPosition]);

  const panelContent =
    open && !disabled ? (
      <div ref={panelRef} style={panelStyle} id={panelId}>
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
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const now = new Date();
                    setDraftDate(now);
                    setMonthDate(now);
                    onChange(now);
                    closePanel();
                  }}
                  className="rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
                >
                  Ahora
                </button>

                {clearable ? (
                  <button
                    type="button"
                    onClick={() => {
                      onChange(null);
                      closePanel();
                    }}
                    className="rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
                  >
                    Limpiar
                  </button>
                ) : null}
              </div>

              <button
                type="button"
                onClick={() => {
                  onChange(draftDate);
                  closePanel();
                }}
                className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition hover:opacity-90"
              >
                Aplicar
              </button>
            </div>
          }
        />
      </div>
    ) : null;

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
            if (open) {
              closePanel();
              return;
            }
            dispatchCloseAllFloatingSelects();
            dispatchCloseAllFloatingDates();
            setOpen(true);
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

      {panelContent ? createPortal(panelContent, document.body) : null}
    </div>
  );
}
