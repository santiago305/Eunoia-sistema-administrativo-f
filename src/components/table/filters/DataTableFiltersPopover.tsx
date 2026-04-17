import { AnimatePresence, motion } from "framer-motion";
import { Funnel, RotateCcw, X } from "lucide-react";
import { createPortal } from "react-dom";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { UI_LAYERS } from "@/components/ui/layers";
import { cn } from "@/lib/utils";
import { DataTableFilterColumn } from "./DataTableFilterColumn";
import { useCascadingFiltersNavigation } from "./useCascadingFiltersNavigation";
import type {
  AppliedDataTableFilter,
  DataTableFiltersPopoverProps,
  FilterLogicOperator,
} from "./types";
import {
  buildAppliedFilterId,
  cloneAppliedFilters,
  removeAppliedFilter,
  upsertAppliedFilter,
} from "./utils";

type PositionState = {
  top: number;
  left: number;
  ready: boolean;
};

const VIEWPORT_PADDING = 8;
const DEFAULT_MIN_WIDTH = 860;
const DEFAULT_MAX_WIDTH = 1120;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(value, max));
}

export function DataTableFiltersPopover({
  open,
  anchorRef,
  categories,
  value,
  onChange,
  onClose,
  title = "Filtros",
  minWidth = DEFAULT_MIN_WIDTH,
  maxWidth = DEFAULT_MAX_WIDTH,
  emptyMessage = "Sin resultados",
}: DataTableFiltersPopoverProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const initialMountRef = useRef(true);

  const [position, setPosition] = useState<PositionState>({
    top: 0,
    left: 0,
    ready: false,
  });

  const [draftFilters, setDraftFilters] = useState<AppliedDataTableFilter[]>([]);

  const {
    activeMode,
    activeGroup,
    activeCategoryId,
    activeModeId,
    activeGroupId,
    operator,
    setOperator,
    selectedOptionIds,
    categoryItems,
    modeItems,
    groupItems,
    optionItems,
    groupSearch,
    setGroupSearch,
    optionSearch,
    setOptionSearch,
    selectCategory,
    selectMode,
    selectGroup,
    toggleOption,
    resetDraftToPath,
  } = useCascadingFiltersNavigation({
    open,
    categories,
    value: draftFilters.length > 0 ? draftFilters : value,
  });

  useEffect(() => {
    if (!open) return;
    setDraftFilters(cloneAppliedFilters(value));
    initialMountRef.current = true;
  }, [open, value]);

  const currentFilterId = useMemo(() => {
    return buildAppliedFilterId({
      categoryId: activeCategoryId,
      modeId: activeModeId,
      groupId: activeGroupId,
    });
  }, [activeCategoryId, activeGroupId, activeModeId]);

  const currentAppliedFilter = useMemo(() => {
    return draftFilters.find((item) => item.id === currentFilterId) ?? null;
  }, [currentFilterId, draftFilters]);

  useEffect(() => {
    if (!open) return;
    if (!currentAppliedFilter) return;

    resetDraftToPath({
      categoryId: currentAppliedFilter.categoryId,
      modeId: currentAppliedFilter.modeId,
      groupId: currentAppliedFilter.groupId,
      optionIds: currentAppliedFilter.optionIds,
      operator: currentAppliedFilter.operator,
    });
  }, [currentAppliedFilter, open, resetDraftToPath]);

  const updatePosition = useCallback(() => {
    const anchor = anchorRef.current;
    const panel = panelRef.current;

    if (!anchor || !panel) return;

    const anchorRect = anchor.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();

    const width = clamp(
      Math.max(minWidth, panelRect.width || minWidth),
      minWidth,
      Math.min(maxWidth, window.innerWidth - VIEWPORT_PADDING * 2),
    );

    const top = clamp(
      anchorRect.bottom + 10,
      VIEWPORT_PADDING,
      window.innerHeight - panelRect.height - VIEWPORT_PADDING,
    );

    const preferredLeft = anchorRect.right - width;
    const left = clamp(
      preferredLeft,
      VIEWPORT_PADDING,
      window.innerWidth - width - VIEWPORT_PADDING,
    );

    setPosition((previous) => {
      if (
        previous.ready &&
        previous.top === top &&
        previous.left === left
      ) {
        return previous;
      }

      return {
        top,
        left,
        ready: true,
      };
    });
  }, [anchorRef, minWidth, maxWidth]);

  useLayoutEffect(() => {
    if (!open) return;

    let raf1 = 0;
    let raf2 = 0;

    raf1 = requestAnimationFrame(() => {
      updatePosition();
      raf2 = requestAnimationFrame(() => {
        updatePosition();
      });
    });

    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;

    const anchor = anchorRef.current;
    const panel = panelRef.current;
    if (!anchor || !panel) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      const clickedInsidePanel = panelRef.current?.contains(target);
      const clickedAnchor = anchorRef.current?.contains(target);

      if (!clickedInsidePanel && !clickedAnchor) {
        onClose();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    const handleViewportChange = () => {
      updatePosition();
    };

    const resizeObserver = new ResizeObserver(() => {
      updatePosition();
    });

    resizeObserver.observe(anchor);
    resizeObserver.observe(panel);

    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [anchorRef, onClose, open, updatePosition]);

  useEffect(() => {
    if (!open) {
      setPosition({ top: 0, left: 0, ready: false });
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (!currentAppliedFilter) return;
    if (initialMountRef.current) {
      initialMountRef.current = false;
      return;
    }
  }, [currentAppliedFilter, open]);

  function setDraftOperator(nextOperator: FilterLogicOperator) {
    setOperator(nextOperator);

    if (!activeCategoryId || !activeModeId || !activeGroupId) return;

    setDraftFilters((current) => {
      const filterId = buildAppliedFilterId({
        categoryId: activeCategoryId,
        modeId: activeModeId,
        groupId: activeGroupId,
      });

      const currentFilter = current.find((item) => item.id === filterId);

      if (!currentFilter) return current;

      return current.map((item) =>
        item.id === filterId ? { ...item, operator: nextOperator } : item,
      );
    });
  }

  function handleToggleOption(optionId: string) {
    if (!activeCategoryId || !activeModeId || !activeGroupId) return;

    const nextOptionIds = selectedOptionIds.includes(optionId)
      ? selectedOptionIds.filter((item) => item !== optionId)
      : [...selectedOptionIds, optionId];

    toggleOption(optionId);

    const nextFilter: AppliedDataTableFilter = {
      id: currentFilterId,
      categoryId: activeCategoryId,
      modeId: activeModeId,
      groupId: activeGroupId,
      operator,
      optionIds: nextOptionIds,
    };

    setDraftFilters((current) => upsertAppliedFilter(current, nextFilter));
  }

  function handleClearCurrent() {
    if (!currentFilterId) return;

    setDraftFilters((current) => removeAppliedFilter(current, currentFilterId));
    resetDraftToPath({
      categoryId: activeCategoryId,
      modeId: activeModeId,
      groupId: activeGroupId,
      optionIds: [],
      operator: "OR",
    });
  }

  function handleClearAll() {
    setDraftFilters([]);
    resetDraftToPath({
      categoryId: categories[0]?.id ?? null,
      modeId: categories[0]?.modes[0]?.id ?? null,
      groupId: categories[0]?.modes[0]?.groups[0]?.id ?? null,
      optionIds: [],
      operator: "OR",
    });
  }

  function handleApply() {
    onChange(draftFilters.filter((item) => item.optionIds.length > 0));
    onClose();
  }

  const selectedCount = draftFilters.reduce(
    (acc, item) => acc + item.optionIds.length,
    0,
  );

  const panelContent = open ? (
    <AnimatePresence>
      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="false"
        initial={{ opacity: 0, scale: 0.985, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.985, y: 6 }}
        transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          "fixed overflow-hidden rounded-2xl border border-border/70 bg-background text-foreground shadow-2xl",
          "flex max-h-[calc(100vh-1rem)] min-h-[26rem] flex-col",
        )}
        style={{
          zIndex: UI_LAYERS.popover + 5,
          top: position.top,
          left: position.left,
          width: `min(${maxWidth}px, calc(100vw - 1rem))`,
          minWidth: `min(${minWidth}px, calc(100vw - 1rem))`,
          visibility: position.ready ? "visible" : "hidden",
        }}
      >
        <div className="flex items-center justify-between gap-4 border-b border-border/70 bg-muted/30 px-4 py-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Funnel className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {selectedCount} opción(es) seleccionada(s)
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground transition hover:bg-muted hover:text-foreground"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-[16rem_14rem_18rem_minmax(18rem,1fr)]">
          <DataTableFilterColumn
            title="Campos"
            items={categoryItems}
            activeId={activeCategoryId}
            onItemClick={selectCategory}
            emptyMessage={emptyMessage}
          />

          <DataTableFilterColumn
            title="Tipo"
            items={modeItems}
            activeId={activeModeId}
            onItemClick={selectMode}
            emptyMessage={emptyMessage}
          />

          <DataTableFilterColumn
            title={activeMode?.label ?? "Grupos"}
            items={groupItems}
            activeId={activeGroupId}
            onItemClick={selectGroup}
            searchable={(activeMode?.groups.length ?? 0) > 6}
            searchValue={groupSearch}
            onSearchChange={setGroupSearch}
            emptyMessage={emptyMessage}
          />

          <section className="flex min-w-[18rem] flex-1 flex-col bg-background">
            <div className="border-b border-border/70 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {activeGroup?.label ?? "Opciones"}
                </h3>

                <div className="inline-flex items-center gap-2 rounded-md border border-border/70 bg-background px-2 py-1 text-xs">
                  <span className="text-muted-foreground">Filtro:</span>

                  <button
                    type="button"
                    onClick={() => setDraftOperator("OR")}
                    className={cn(
                      "rounded px-2 py-1 font-medium transition",
                      operator === "OR"
                        ? "bg-primary/12 text-primary"
                        : "text-muted-foreground hover:bg-muted",
                    )}
                  >
                    OR
                  </button>

                  <button
                    type="button"
                    onClick={() => setDraftOperator("AND")}
                    className={cn(
                      "rounded px-2 py-1 font-medium transition",
                      operator === "AND"
                        ? "bg-primary/12 text-primary"
                        : "text-muted-foreground hover:bg-muted",
                    )}
                  >
                    AND
                  </button>
                </div>
              </div>
            </div>

            <div className="border-b border-border/70 px-3 py-2">
              <div className="relative">
                <input
                  value={optionSearch}
                  onChange={(event) => setOptionSearch(event.target.value)}
                  placeholder={activeGroup?.searchable ? "Buscar..." : "Buscar..."}
                  className="h-9 w-full rounded-md border border-border/70 bg-background px-3 text-xs outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <div className="scrollbar-panel min-h-0 flex-1 overflow-y-auto p-1.5">
              {optionItems.length === 0 ? (
                <div className="px-3 py-3 text-xs text-muted-foreground">
                  {emptyMessage}
                </div>
              ) : (
                optionItems.map((option) => {
                  const isSelected = selectedOptionIds.includes(option.id);

                  return (
                    <button
                      key={option.id}
                      type="button"
                      disabled={option.disabled}
                      onClick={() => handleToggleOption(option.id)}
                      className={cn(
                        "flex w-full items-center justify-between gap-3 rounded-md px-3 py-2.5 text-left text-sm transition",
                        option.disabled
                          ? "cursor-not-allowed opacity-50"
                          : "hover:bg-muted/60",
                        isSelected
                          ? "bg-primary/10 text-foreground"
                          : "text-foreground",
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">{option.label}</div>
                        {typeof option.count === "number" ? (
                          <div className="mt-0.5 text-[11px] text-muted-foreground">
                            {option.count}
                          </div>
                        ) : null}
                      </div>

                      <span
                        className={cn(
                          "inline-flex h-5 min-w-5 items-center justify-center rounded border px-1.5 text-[10px] font-semibold",
                          isSelected
                            ? "border-primary/20 bg-primary/12 text-primary"
                            : "border-border/70 text-transparent",
                        )}
                      >
                        ✓
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </section>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border/70 bg-muted/25 px-4 py-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleClearCurrent}
              className="inline-flex h-9 items-center justify-center rounded-md border border-border/70 bg-background px-3 text-xs font-medium transition hover:bg-muted"
            >
              Limpiar actual
            </button>

            <button
              type="button"
              onClick={handleClearAll}
              className="inline-flex h-9 items-center justify-center rounded-md border border-border/70 bg-background px-3 text-xs font-medium transition hover:bg-muted"
            >
              <RotateCcw className="mr-2 h-3.5 w-3.5" />
              Limpiar todo
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 items-center justify-center rounded-md border border-border/70 bg-background px-4 text-xs font-medium transition hover:bg-muted"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleApply}
              className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-xs font-semibold text-primary-foreground transition hover:opacity-90"
            >
              Aplicar filtros
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  ) : null;

  if (typeof document === "undefined") return null;
  return createPortal(panelContent, document.body);
}
