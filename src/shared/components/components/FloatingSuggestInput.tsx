import { Check } from "lucide-react";
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
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { cn } from "@/shared/lib/utils";
import { UI_LAYERS } from "@/shared/components/ui/layers";
import { FloatingRequiredLabel } from "./FloatingRequiredLabel";

export type FloatingSuggestOption = {
  value: string;
  label: string;
  searchText?: string;
  metaText?: string;
};

export type FloatingSuggestInputProps = {
  label: string;
  name: string;
  value: string;
  onChange: (text: string) => void;
  onOptionSelect?: (option: FloatingSuggestOption) => void;
  options: FloatingSuggestOption[];
  placeholder?: string;
  disabled?: boolean;
  requiredIndicator?: boolean;
  error?: string;
  "aria-label"?: string;
  className?: string;
  containerClassName?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  maxHeight?: number;
  panelWidthMode?: "trigger" | "min-trigger";
};

export function FloatingSuggestInput({
  label,
  name,
  value,
  onChange,
  onOptionSelect,
  options,
  placeholder,
  disabled = false,
  requiredIndicator = false,
  error,
  "aria-label": ariaLabel,
  className = "",
  containerClassName = "",
  searchPlaceholder,
  emptyMessage = "Sin resultados",
  maxHeight = 256,
  panelWidthMode = "trigger",
}: FloatingSuggestInputProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({});
  const panelId = useId();
  const labelId = useId();
  const errorId = useId();

  const normalizedQuery = value.trim().toLowerCase();
  const filteredOptions = useMemo(() => {
    if (!normalizedQuery) return options;
    return options.filter((opt) =>
      (opt.searchText ?? opt.label).toLowerCase().includes(normalizedQuery),
    );
  }, [normalizedQuery, options]);

  const hasValue = value.trim().length > 0;
  const activeOptionId =
    open && activeIndex >= 0 ? `${panelId}-option-${activeIndex}` : undefined;

  const closePanel = useCallback(() => {
    setOpen(false);
    setActiveIndex(-1);
  }, []);

  const openPanel = useCallback(() => {
    if (disabled) return;
    setOpen(true);
  }, [disabled]);

  const updatePanelPosition = useCallback(() => {
    const inputEl = inputRef.current;
    const panelEl = panelRef.current;

    if (!inputEl || !panelEl) {
      closePanel();
      return;
    }

    if (!inputEl.isConnected || !panelEl.isConnected) {
      closePanel();
      return;
    }

    const rect = inputEl.getBoundingClientRect();
    const spacing = 8;
    const viewportPadding = 8;
    const spaceBelow = window.innerHeight - rect.bottom - spacing - viewportPadding;
    const spaceAbove = rect.top - spacing - viewportPadding;
    const openAbove = spaceBelow < 220 && spaceAbove > spaceBelow;
    const top = openAbove
      ? Math.max(viewportPadding, rect.top - spacing - panelEl.offsetHeight)
      : rect.bottom + spacing;
    const width = rect.width;
    const widthStyle =
      panelWidthMode === "min-trigger"
        ? { minWidth: width, maxWidth: `calc(100vw - ${viewportPadding * 2}px)` }
        : { width };
    const left = Math.min(
      Math.max(viewportPadding, rect.left),
      Math.max(viewportPadding, window.innerWidth - width - viewportPadding),
    );

    setPanelStyle({
      position: "fixed",
      top,
      left,
      zIndex: UI_LAYERS.floatingSelect,
      ...widthStyle,
    });
  }, [closePanel, panelWidthMode]);

  useLayoutEffect(() => {
    if (!open) return;
    let raf1 = 0;
    let raf2 = 0;

    raf1 = window.requestAnimationFrame(() => {
      updatePanelPosition();
      raf2 = window.requestAnimationFrame(() => updatePanelPosition());
    });

    return () => {
      window.cancelAnimationFrame(raf1);
      window.cancelAnimationFrame(raf2);
    };
  }, [filteredOptions.length, open, updatePanelPosition, value]);

  useEffect(() => {
    if (!open) return;

    const inputEl = inputRef.current;
    const panelEl = panelRef.current;
    if (!inputEl || !panelEl) return;

    let frameId = 0;
    const handleViewportChange = () => {
      if (frameId) return;
      frameId = window.requestAnimationFrame(() => {
        frameId = 0;
        updatePanelPosition();
      });
    };

    const resizeObserver = new ResizeObserver(() => handleViewportChange());
    resizeObserver.observe(inputEl);
    resizeObserver.observe(panelEl);
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);

    return () => {
      resizeObserver.disconnect();
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [open, updatePanelPosition]);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!rootRef.current) return;
      if (
        !rootRef.current.contains(target) &&
        (!panelRef.current || !panelRef.current.contains(target))
      ) {
        closePanel();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") closePanel();
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [closePanel, open]);

  useEffect(() => {
    if (!open) return;
    const matchIndex = filteredOptions.findIndex(
      (opt) => opt.label.trim().toLowerCase() === normalizedQuery,
    );
    setActiveIndex(matchIndex >= 0 ? matchIndex : filteredOptions.length > 0 ? 0 : -1);
  }, [filteredOptions, normalizedQuery, open]);

  const commitOption = useCallback(
    (index: number) => {
      const option = filteredOptions[index];
      if (!option) return;
      onChange(option.label);
      onOptionSelect?.(option);
      closePanel();
    },
    [closePanel, filteredOptions, onChange, onOptionSelect],
  );

  const handleKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLInputElement>) => {
      if (!open && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
        openPanel();
        return;
      }

      if (!open) return;

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveIndex((prev) => {
          if (filteredOptions.length === 0) return -1;
          if (prev < 0) return 0;
          return (prev + 1) % filteredOptions.length;
        });
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex((prev) => {
          if (filteredOptions.length === 0) return -1;
          if (prev < 0) return filteredOptions.length - 1;
          return (prev - 1 + filteredOptions.length) % filteredOptions.length;
        });
        return;
      }

      if (event.key === "Enter") {
        if (activeIndex >= 0) {
          event.preventDefault();
          commitOption(activeIndex);
        }
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        closePanel();
      }
    },
    [activeIndex, closePanel, commitOption, filteredOptions.length, open, openPanel],
  );

  const describedBy = [error ? errorId : null].filter(Boolean).join(" ") || undefined;

  const panel = open && !disabled ? (
    <div
      ref={(node) => {
        panelRef.current = node;
        if (node) {
          requestAnimationFrame(() => updatePanelPosition());
        }
      }}
      id={panelId}
      role="listbox"
      aria-labelledby={labelId}
      aria-activedescendant={activeOptionId}
      className="fixed overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-floating-panel"
      style={panelStyle}
      onMouseDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
      data-floating-overlay-root="true"
    >
      {searchPlaceholder ? (
        <div className="border-b border-border px-3 py-2 text-[11px] text-muted-foreground">
          {searchPlaceholder}
        </div>
      ) : null}

      <div
        className="scroll-area scrollbar-panel overflow-y-auto py-1"
        style={{ maxHeight }}
      >
        {filteredOptions.length === 0 ? (
          <div className="px-3 py-2 text-xs text-muted-foreground">{emptyMessage}</div>
        ) : (
          filteredOptions.map((option, index) => {
            const isActive = index === activeIndex;
            const isExact = option.label.trim().toLowerCase() === normalizedQuery && normalizedQuery.length > 0;

            return (
              <button
                key={`${option.value}-${index}`}
                id={`${panelId}-option-${index}`}
                type="button"
                role="option"
                aria-selected={isActive}
                className={cn(
                  "flex w-full items-center gap-3 px-3 py-2 text-left text-xs transition-colors",
                  isActive ? "bg-muted text-foreground" : "text-foreground hover:bg-muted",
                )}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseDown={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  commitOption(index);
                }}
              >
                <span className="min-w-0 flex-1 truncate">{option.label}</span>
                {option.metaText ? (
                  <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground tabular-nums">
                    {option.metaText}
                  </span>
                ) : null}
                {isExact ? (
                  <Check className="h-4 w-4 shrink-0 text-primary" />
                ) : null}
              </button>
            );
          })
        )}
      </div>
    </div>
  ) : null;

  return (
    <div ref={rootRef} className={cn("w-full", containerClassName)}>
      <div className="relative">
        <input
          ref={inputRef}
          id={name}
          name={name}
          autoComplete="off"
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
            openPanel();
          }}
          onFocus={() => openPanel()}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            // Defer close to allow option mousedown selection to win.
            requestAnimationFrame(() => {
              const active = document.activeElement;
              if (
                panelRef.current &&
                active instanceof Node &&
                panelRef.current.contains(active)
              ) {
                return;
              }
              closePanel();
            });
          }}
          disabled={disabled}
          required={requiredIndicator}
          placeholder={placeholder ?? " "}
          aria-label={ariaLabel ?? (requiredIndicator ? label : undefined)}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          aria-expanded={open}
          aria-controls={open ? panelId : undefined}
          aria-activedescendant={activeOptionId}
          className={cn(
            "peer h-10 w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground outline-none transition-all",
            error
              ? "border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-200/40"
              : "border-border focus:border-primary focus:ring-2 focus:ring-primary/30",
            disabled ? "cursor-not-allowed border-border/70 bg-muted text-muted-foreground" : "",
            className,
          )}
        />

        <label
          id={labelId}
          htmlFor={name}
          className={cn(
            "pointer-events-none absolute left-3 px-1 text-xs transition-all duration-200",
            disabled ? "bg-muted" : "bg-background",
            hasValue || open ? "top-0 -translate-y-1/2 text-[11px]" : "top-1/2 -translate-y-1/2",
            disabled
              ? "text-muted-foreground/80 peer-focus:text-muted-foreground/80"
              : error
                ? "text-red-500 peer-focus:text-red-500"
                : "text-muted-foreground peer-focus:text-primary",
            "peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-[11px]",
          )}
        >
          <FloatingRequiredLabel label={label} required={requiredIndicator} />
        </label>
      </div>

      {panel ? createPortal(panel, document.body) : null}

      {error ? (
        <p id={errorId} className="mt-1 text-xs text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
