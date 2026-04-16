import { motion } from "framer-motion";
import { Check, ChevronDown, X } from "lucide-react";
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
import {
  CLOSE_ALL_FLOATING_SELECTS_EVENT,
  dispatchCloseAllFloatingSelects,
} from "@/components/floatingSelectEvents";
import { UI_LAYERS } from "@/components/ui/layers";
import { SystemButton } from "@/components/SystemButton";

type MultiSelectOption = {
  value: string;
  label: string;
};

type FloatingMultiSelectProps = {
  label: string;
  name: string;
  value: string[];
  options: MultiSelectOption[];
  onChange: (value: string[]) => void;
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

export function FloatingMultiSelect({
  label,
  name,
  value,
  options,
  onChange,
  error,
  placeholder = "Seleccionar opciones",
  disabled = false,
  className = "",
  containerClassName = "",
  searchable = false,
  searchPlaceholder = "Buscar...",
  emptyMessage = "Sin resultados",
  onSearchChange,
  preserveSearchOnClose = false,
  panelWidthMode = "trigger",
}: FloatingMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({});
  const [listMaxHeight, setListMaxHeight] = useState(256);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
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

  const filteredOptions = useMemo(() => {
    if (!searchable) return options;

    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return options;

    return options.filter((option) =>
      option.label.toLowerCase().includes(normalizedQuery),
    );
  }, [options, query, searchable]);

  const selectedOptions = useMemo(
    () => options.filter((option) => value.includes(option.value)),
    [options, value],
  );

  const displayValue = useMemo(() => {
    if (selectedOptions.length === 0) return "";
    if (selectedOptions.length <= 2) {
      return selectedOptions.map((option) => option.label).join(", ");
    }
    return `${selectedOptions[0]?.label ?? ""} +${selectedOptions.length - 1}`;
  }, [selectedOptions]);

  const hasValue = value.length > 0;
  const activeOptionId =
    open && activeIndex >= 0 ? `${panelId}-option-${activeIndex}` : undefined;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (!rootRef.current) return;

      if (
        !rootRef.current.contains(target) &&
        (!panelRef.current || !panelRef.current.contains(target))
      ) {
        closeSelect();
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeSelect();
      }
    }

    function handleCloseAll() {
      closeSelect();
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    window.addEventListener(CLOSE_ALL_FLOATING_SELECTS_EVENT, handleCloseAll);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
      window.removeEventListener(CLOSE_ALL_FLOATING_SELECTS_EVENT, handleCloseAll);
    };
  }, [closeSelect]);

  useEffect(() => {
    if (open && searchable) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);

      return () => clearTimeout(timer);
    }
  }, [open, searchable]);

  useEffect(() => {
    if (disabled && open) {
      closeSelect();
    }
  }, [closeSelect, disabled, open]);

  useEffect(() => {
    if (!open) return;
    setActiveIndex(filteredOptions.length > 0 ? 0 : -1);
  }, [filteredOptions, open]);

  const updatePanelPosition = useCallback(() => {
    const triggerEl = triggerRef.current;
    const panelEl = panelRef.current;

    if (!triggerEl || !panelEl || !triggerEl.isConnected || !panelEl.isConnected) {
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

    setPanelStyle({
      position: "fixed",
      top,
      left,
      zIndex: UI_LAYERS.floatingSelect,
      ...widthStyle,
    });
    setListMaxHeight(Math.max(96, Math.min(256, openAbove ? spaceAbove : spaceBelow)));
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
      raf2 = window.requestAnimationFrame(() => updatePanelPosition());
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

    const handleViewportChange = () => {
      updatePanelPosition();
    };

    const resizeObserver = new ResizeObserver(() => {
      updatePanelPosition();
    });

    resizeObserver.observe(triggerEl);
    resizeObserver.observe(panelEl);

    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [closeSelect, open, updatePanelPosition]);

  const toggleValue = useCallback((optionValue: string) => {
    const exists = value.includes(optionValue);
    onChange(
      exists
        ? value.filter((currentValue) => currentValue !== optionValue)
        : [...value, optionValue],
    );
  }, [onChange, value]);

  const moveActiveIndex = useCallback((direction: -1 | 1) => {
    setActiveIndex((current) => {
      if (filteredOptions.length === 0) return -1;
      if (current < 0) return direction > 0 ? 0 : filteredOptions.length - 1;
      return (current + direction + filteredOptions.length) % filteredOptions.length;
    });
  }, [filteredOptions.length]);

  const toggleActiveOption = useCallback(() => {
    if (activeIndex < 0) return;
    const option = filteredOptions[activeIndex];
    if (!option) return;
    toggleValue(option.value);
  }, [activeIndex, filteredOptions, toggleValue]);

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

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      toggleActiveOption();
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      closeSelect();
      triggerRef.current?.focus();
      return;
    }

    if (event.key === "Tab") {
      closeSelect();
    }
  }, [closeSelect, filteredOptions.length, moveActiveIndex, open, toggleActiveOption]);

  const panelContent = open && !disabled ? (
    <motion.div
      ref={setPanelNode}
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className="fixed overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-floating-panel"
      style={panelStyle}
      id={panelId}
      role="listbox"
      tabIndex={searchable ? -1 : 0}
      aria-labelledby={labelId}
      aria-activedescendant={activeOptionId}
      aria-multiselectable="true"
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
            onKeyDown={handleKeyboardNavigation}
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
      >
        {filteredOptions.length === 0 ? (
          <div className="px-3 py-2 text-xs text-muted-foreground">
            {emptyMessage}
          </div>
        ) : (
          filteredOptions.map((option, index) => {
            const isSelected = value.includes(option.value);
            const isActive = activeIndex === index;

            return (
              <button
                key={option.value}
                id={`${panelId}-option-${index}`}
                type="button"
                onMouseDown={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  toggleValue(option.value);
                }}
                onMouseEnter={() => setActiveIndex(index)}
                className={[
                  "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs transition-colors",
                  isSelected
                    ? "bg-primary/10 text-primary"
                    : isActive
                      ? "bg-muted text-foreground"
                      : "text-foreground hover:bg-muted",
                ].join(" ")}
                role="option"
                aria-selected={isSelected}
              >
                <span className="truncate">{option.label}</span>
                {isSelected ? <Check className="h-4 w-4 shrink-0" /> : null}
              </button>
            );
          })
        )}
      </div>

      <div className="flex items-center justify-between border-t border-border p-2">
        <div className="text-[11px] text-muted-foreground">
          {selectedOptions.length} seleccionado(s)
        </div>

        <SystemButton
          type="button"
          variant="ghost"
          size="custom"
          className="h-7 rounded-md px-2.5 text-[11px] text-muted-foreground hover:text-foreground"
          onClick={() => onChange([])}
        >
          Limpiar
        </SystemButton>
      </div>
    </motion.div>
  ) : null;

  return (
    <div ref={rootRef} className={`w-full ${containerClassName}`}>
      <div className="relative">
        <button
          ref={triggerRef}
          type="button"
          id={name}
          name={name}
          disabled={disabled}
          onClick={() => {
            if (disabled) return;
            if (open) {
              closeSelect();
              return;
            }

            dispatchCloseAllFloatingSelects();
            if (!preserveSearchOnClose) {
              setQuery("");
            }
            setOpen(true);
          }}
          onKeyDown={(event) => {
            if (disabled) return;

            if (event.key === "ArrowDown") {
              event.preventDefault();
              if (!open) {
                dispatchCloseAllFloatingSelects();
                setOpen(true);
                return;
              }
              moveActiveIndex(1);
              return;
            }

            if (event.key === "ArrowUp") {
              event.preventDefault();
              if (!open) {
                dispatchCloseAllFloatingSelects();
                setOpen(true);
                return;
              }
              moveActiveIndex(-1);
              return;
            }

            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              if (!open) {
                dispatchCloseAllFloatingSelects();
                setOpen(true);
                return;
              }
              toggleActiveOption();
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
          aria-describedby={error ? errorId : undefined}
        >
          <span
            className={`truncate pr-2 ${hasValue ? "text-foreground" : "text-muted-foreground"}`}
            title={displayValue || placeholder}
          >
            {displayValue || placeholder}
          </span>

          <div className="flex shrink-0 items-center gap-1">
            {hasValue ? (
              <span
                role="button"
                tabIndex={-1}
                onMouseDown={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onChange([]);
                }}
                className="inline-flex h-5 w-5 items-center justify-center rounded text-muted-foreground transition hover:bg-muted hover:text-foreground"
                aria-label={`Limpiar ${label}`}
              >
                <X className="h-3.5 w-3.5" />
              </span>
            ) : null}

            <ChevronDown
              className={`h-4 w-4 transition-transform duration-200 ${open ? "rotate-180" : ""} ${
                error ? "text-red-500" : open ? "text-primary" : "text-muted-foreground"
              }`}
            />
          </div>
        </button>

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
