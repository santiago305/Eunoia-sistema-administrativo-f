import { motion } from "framer-motion";
import { Check, ChevronDown } from "lucide-react";
import { createPortal } from "react-dom";
import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent, type WheelEvent as ReactWheelEvent } from "react";
import {
  CLOSE_ALL_FLOATING_SELECTS_EVENT,
  dispatchCloseAllFloatingSelects,
} from "../components/floatingSelectEvents";
import { SystemButton } from "@/shared/components/components/SystemButton";
import { UI_LAYERS } from "@/shared/components/ui/layers";

type SelectOption = {
  value: string;
  label: string;
};

type FloatingSelectProps = {
  label: string;
  name: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  containerClassName?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  emptyMessage?: string;
  onSearchChange?: (value: string) => void;
  preserveSearchOnClose?: boolean;
  panelWidthMode?: "trigger" | "min-trigger";
};

export function FloatingSelect({
  label,
  name,
  value,
  options,
  onChange,
  error,
  placeholder,
  disabled = false,
  className = "",
  containerClassName = "",
  searchable = false,
  searchPlaceholder = "Buscar...",
  emptyMessage = "Sin resultados",
  onSearchChange,
  preserveSearchOnClose = false,
  panelWidthMode = "trigger",
}: FloatingSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({});
  const [listMaxHeight, setListMaxHeight] = useState(256);
  const panelId = useId();
  const labelId = useId();
  const errorId = useId();

  const closeSelect = useCallback(() => {
    setOpen(false);
    if (!preserveSearchOnClose) {
      setQuery("");
    }
    setActiveIndex(-1);
  }, [preserveSearchOnClose]);

  const selectedOption = useMemo(
    () => options.find((option) => option.value === value),
    [options, value],
  );

  const filteredOptions = useMemo(() => {
    if (!searchable) return options;

    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return options;

    return options.filter((option) =>
      option.label.toLowerCase().includes(normalizedQuery),
    );
  }, [options, query, searchable]);

  const hasValue = value.trim().length > 0;
  const activeOptionId =
    open && activeIndex >= 0 ? `${panelId}-option-${activeIndex}` : undefined;

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      if (!rootRef.current) return;

      if (
        !rootRef.current.contains(target) &&
        (!panelRef.current || !panelRef.current.contains(target))
      ) {
        closeSelect();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeSelect();
      }
    };

    const handleCloseAll = () => {
      closeSelect();
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    window.addEventListener(CLOSE_ALL_FLOATING_SELECTS_EVENT, handleCloseAll);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
      window.removeEventListener(CLOSE_ALL_FLOATING_SELECTS_EVENT, handleCloseAll);
    };
  }, [closeSelect, open]);

  useEffect(() => {
    if (open && searchable) {
      const frameId = window.requestAnimationFrame(() => {
        searchInputRef.current?.focus();
      });

      return () => window.cancelAnimationFrame(frameId);
    }
  }, [open, searchable]);

  useEffect(() => {
    if (disabled && open) {
      closeSelect();
    }
  }, [closeSelect, disabled, open]);

  useEffect(() => {
    if (!open) return;

    const selectedIndex = filteredOptions.findIndex((option) => option.value === value);
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : filteredOptions.length > 0 ? 0 : -1);
  }, [filteredOptions, open, value]);

  const updatePanelPosition = useCallback(() => {
    const triggerEl = triggerRef.current;
    const panelEl = panelRef.current;

    if (!triggerEl || !panelEl) {
      closeSelect();
      return;
    }

    if (!triggerEl.isConnected || !panelEl.isConnected) {
      closeSelect();
      return;
    }

    const rect = triggerEl.getBoundingClientRect();
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

    const nextStyle: CSSProperties = {
      position: "fixed",
      top,
      left,
      zIndex: UI_LAYERS.floatingSelect,
      ...widthStyle,
    };
    const nextMaxHeight = Math.max(
      96,
      Math.min(256, openAbove ? spaceAbove : spaceBelow),
    );

    setPanelStyle((previous) => {
      const keys = Object.keys(nextStyle) as Array<keyof CSSProperties>;
      const previousKeys = Object.keys(previous) as Array<keyof CSSProperties>;

      if (previousKeys.length !== keys.length) return nextStyle;
      for (const key of keys) {
        if (previous[key] !== nextStyle[key]) return nextStyle;
      }
      return previous;
    });
    setListMaxHeight((previous) => (previous === nextMaxHeight ? previous : nextMaxHeight));
  }, [closeSelect, panelWidthMode]);

  const setPanelNode = useCallback((node: HTMLDivElement | null) => {
    panelRef.current = node;

    if (node) {
      window.requestAnimationFrame(() => {
        updatePanelPosition();
        if (!searchable) {
          node.focus();
        }
      });
    }
  }, [searchable, updatePanelPosition]);

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
  }, [filteredOptions.length, open, query, searchable, updatePanelPosition]);

  useEffect(() => {
    if (!open) return;

    const triggerEl = triggerRef.current;
    const panelEl = panelRef.current;

    if (!triggerEl || !panelEl) {
      closeSelect();
      return;
    }

    let frameId = 0;

    const handleViewportChange = () => {
      if (frameId) return;
      frameId = window.requestAnimationFrame(() => {
        frameId = 0;
        updatePanelPosition();
      });
    };

    const resizeObserver = new ResizeObserver(() => {
      handleViewportChange();
    });

    resizeObserver.observe(triggerEl);
    resizeObserver.observe(panelEl);

    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);

    return () => {
      resizeObserver.disconnect();
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [closeSelect, open, updatePanelPosition]);

  useEffect(() => {
    if (!open || activeIndex < 0 || !panelRef.current) return;

    const activeOption = panelRef.current.querySelector<HTMLElement>(
      `#${CSS.escape(`${panelId}-option-${activeIndex}`)}`,
    );

    activeOption?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open, panelId]);

  const openSelect = useCallback(
    (preferredIndex?: number) => {
      dispatchCloseAllFloatingSelects();
      if (!preserveSearchOnClose) {
        setQuery("");
      }
      setOpen(true);
      if (typeof preferredIndex === "number") {
        setActiveIndex(filteredOptions[preferredIndex] ? preferredIndex : -1);
      }
    },
    [filteredOptions, preserveSearchOnClose],
  );

  const moveActiveIndex = useCallback((direction: -1 | 1) => {
    setActiveIndex((current) => {
      if (filteredOptions.length === 0) return -1;
      if (current < 0) return direction > 0 ? 0 : filteredOptions.length - 1;
      return (current + direction + filteredOptions.length) % filteredOptions.length;
    });
  }, [filteredOptions.length]);

  const handleListWheel = useCallback((event: ReactWheelEvent<HTMLDivElement>) => {
    if (!open || filteredOptions.length === 0) return;
    event.preventDefault();
    moveActiveIndex(event.deltaY > 0 ? 1 : -1);
  }, [filteredOptions.length, moveActiveIndex, open]);

  const selectActiveOption = useCallback(() => {
    if (activeIndex < 0) return;
    const option = filteredOptions[activeIndex];
    if (!option) return;
    onChange(option.value);
    closeSelect();
  }, [activeIndex, closeSelect, filteredOptions, onChange]);

  const handleKeyboardNavigation = useCallback((event: ReactKeyboardEvent<HTMLElement>) => {
    if (!open) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveActiveIndex(1);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      moveActiveIndex(-1);
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      setActiveIndex(filteredOptions.length > 0 ? 0 : -1);
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      setActiveIndex(filteredOptions.length > 0 ? filteredOptions.length - 1 : -1);
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      selectActiveOption();
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();

      closeSelect();

      requestAnimationFrame(() => {
        searchInputRef.current?.blur();
        triggerRef.current?.blur();
      });

      return;
    }

    if (event.key === "Tab") {
      closeSelect();
    }
  }, [closeSelect, filteredOptions.length, moveActiveIndex, open, selectActiveOption]);

  const panelContent = open && !disabled ? (
    <motion.div
      ref={setPanelNode}
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className="fixed overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-floating-panel"
      data-floating-overlay-root="true"
      style={panelStyle}
      id={panelId}
      role="listbox"
      tabIndex={searchable ? -1 : 0}
      aria-labelledby={labelId}
      aria-activedescendant={activeOptionId}
      onMouseDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={handleKeyboardNavigation}
    >
      {searchable ? (
        <div className="border-b border-border p-2">
          <input
            ref={searchInputRef}
            value={query}
            onChange={(event) => {
              const next = event.target.value;
              setQuery(next);
              onSearchChange?.(next);
            }}
            onKeyDown={(event) => {
              event.stopPropagation();
              handleKeyboardNavigation(event);
            }}
            placeholder={searchPlaceholder}
            aria-label={`Buscar ${label}`}
            aria-controls={panelId}
            className="h-9 w-full rounded-md border border-border bg-background px-3 text-xs text-foreground outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/30"
          />
        </div>
      ) : null}

      <div
        className="scrollbar-panel overflow-y-auto py-1"
        style={{ maxHeight: listMaxHeight }}
        onWheel={handleListWheel}
      >
        {filteredOptions.length === 0 ? (
          <div className="px-3 py-2 text-xs text-muted-foreground">
            {emptyMessage}
          </div>
        ) : (
          filteredOptions.map((option, index) => {
            const isSelected = option.value === value;
            const isActive = activeIndex === index;

            return (
              <SystemButton
                key={option.value}
                id={`${panelId}-option-${index}`}
                type="button"
                variant="ghost"
                size="custom"
                onMouseDown={(event) => {
                  // Selection happens on mousedown so it wins before the
                  // document-level outside click listener closes the panel.
                  event.preventDefault();
                  event.stopPropagation();
                  onChange(option.value);
                  closeSelect();
                }}
                onMouseEnter={() => setActiveIndex(index)}
                className={[
                  "flex w-full items-center justify-between px-3 py-2 text-left text-xs transition-colors",
                  isSelected
                    ? "bg-primary/10 text-primary"
                    : isActive
                      ? "bg-muted text-foreground"
                    : "text-foreground hover:bg-muted",
                ].join(" ")}
                role="option"
                aria-selected={isSelected}
              >
                <span>{option.label}</span>
                {isSelected ? <Check className="h-4 w-4" /> : null}
              </SystemButton>
            );
          })
        )}
      </div>
    </motion.div>
  ) : null;

  return (
    <div ref={rootRef} className={`w-full ${containerClassName}`}>
      <div className="relative">
        <SystemButton
          ref={triggerRef}
          type="button"
          variant="outline"
          size="custom"
          id={name}
          name={name}
          disabled={disabled}
          onClick={() => {
            if (disabled) return;
            if (open) {
              closeSelect();
              return;
            }

            const selectedIndex = filteredOptions.findIndex((option) => option.value === value);
            openSelect(selectedIndex >= 0 ? selectedIndex : 0);
          }}
          onKeyDown={(event) => {
            if (disabled) return;

            const selectedIndex = filteredOptions.findIndex((option) => option.value === value);

            if (event.key === "ArrowDown") {
              event.preventDefault();
              if (!open) {
                openSelect(selectedIndex >= 0 ? selectedIndex : 0);
                return;
              }
              moveActiveIndex(1);
              return;
            }

            if (event.key === "ArrowUp") {
              event.preventDefault();
              if (!open) {
                openSelect(selectedIndex >= 0 ? selectedIndex : Math.max(filteredOptions.length - 1, 0));
                return;
              }
              moveActiveIndex(-1);
              return;
            }

            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              if (!open) {
                openSelect(selectedIndex >= 0 ? selectedIndex : 0);
                return;
              }
              selectActiveOption();
            }
          }}
          className={[
            "relative flex h-10 w-full items-center justify-between rounded-lg border bg-background px-3 py-2 text-left text-xs text-foreground outline-none transition-all",
            error
              ? "border-red-500 ring-0"
              : open
                ? "border-primary ring-2 ring-primary/30"
                : "border-border",
            disabled ? "cursor-not-allowed bg-muted text-muted-foreground" : "",
            className,
          ].join(" ")}
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-controls={open ? panelId : undefined}
          aria-label={selectedOption ? `${label}: ${selectedOption.label}` : label}
          aria-describedby={error ? errorId : undefined}
        >
          <span
            className={`truncate pr-2 ${selectedOption ? "text-foreground" : "text-muted-foreground"}`}
            title={selectedOption?.label ?? placeholder ?? ""}
          >
            {selectedOption?.label ?? placeholder}
          </span>

          <ChevronDown
            className={`h-4 w-4 shrink-0 transition-transform duration-200 ${
              open ? "rotate-180" : ""
            } ${
              error ? "text-red-500" : open ? "text-primary" : "text-muted-foreground"
            }`}
          />
        </SystemButton>

        <label
          id={labelId}
          className={[
            "pointer-events-none absolute left-3 bg-background px-1 transition-all duration-200",
            hasValue || open
              ? "top-0 -translate-y-1/2 text-[11px]"
              : "top-1/2 -translate-y-1/2 text-xs",
            error ? "text-red-500" : open ? "text-primary" : "text-muted-foreground",
          ].join(" ")}
        >
          {label}
        </label>
      </div>

      {panelContent ? createPortal(panelContent, document.body) : null}

      {error ? <p id={errorId} className="mt-1 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
