import { Check, RotateCcw } from "lucide-react";
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
  right: number;
  ready: boolean;
};

const VIEWPORT_PADDING = 8;

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
  minWidth,
  maxWidth,
  emptyMessage = "Sin resultados",
}: DataTableFiltersPopoverProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState<PositionState>({
    top: 0,
    right: 0,
    ready: false,
  });
  const [draftFilters, setDraftFilters] = useState<AppliedDataTableFilter[]>([]);

  const {
    activeCategory,
    activeGroup,
    activeCategoryId,
    activeModeId,
    activeGroupId,
    operator,
    setOperator,
    selectedOptionIds,
    categoryItems,
    optionItems,
    optionSearch,
    setOptionSearch,
    selectCategory,
    toggleOption,
    resetDraftToPath,
  } = useCascadingFiltersNavigation({
    open,
    categories,
    value: draftFilters,
  });

  useEffect(() => {
    if (!open) return;
    setDraftFilters(cloneAppliedFilters(value));
  }, [open, value]);

  const currentFilterId = useMemo(
    () =>
      buildAppliedFilterId({
        categoryId: activeCategoryId,
        modeId: activeModeId,
        groupId: activeGroupId,
      }),
    [activeCategoryId, activeGroupId, activeModeId],
  );

  const currentAppliedFilter = useMemo(
    () => draftFilters.find((item) => item.id === currentFilterId) ?? null,
    [currentFilterId, draftFilters],
  );

  useEffect(() => {
    if (!open || !currentAppliedFilter) return;

    resetDraftToPath({
      categoryId: currentAppliedFilter.categoryId,
      modeId: currentAppliedFilter.modeId,
      groupId: currentAppliedFilter.groupId,
      optionIds: currentAppliedFilter.optionIds,
      operator: currentAppliedFilter.operator,
    });
  }, [currentAppliedFilter, open, resetDraftToPath]);

  const isExpanded = Boolean(activeCategoryId && activeGroupId);
  const selectedCategoryIds = useMemo(
    () => [...new Set(draftFilters.map((item) => item.categoryId))],
    [draftFilters],
  );
  const showFooter = isExpanded || draftFilters.length > 0;

  const updatePosition = useCallback(() => {
    const anchor = anchorRef.current;
    const panel = panelRef.current;
    if (!anchor || !panel) return;

    const anchorRect = anchor.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();
    const maxAllowedWidth = Math.min(
      maxWidth ?? Number.POSITIVE_INFINITY,
      window.innerWidth - VIEWPORT_PADDING * 2,
    );
    const width = Math.min(panel.offsetWidth || anchorRect.width, maxAllowedWidth);
    const height = panel.offsetHeight || panelRect.height;
    const top = clamp(
      anchorRect.bottom + 10,
      VIEWPORT_PADDING,
      window.innerHeight - height - VIEWPORT_PADDING,
    );
    const preferredRight = window.innerWidth - anchorRect.right;
    const right = clamp(
      preferredRight,
      VIEWPORT_PADDING,
      window.innerWidth - width - VIEWPORT_PADDING,
    );

    setPosition((previous) => {
      if (previous.ready && previous.top === top && previous.right === right) {
        return previous;
      }

      return { top, right, ready: true };
    });
  }, [anchorRef, maxWidth]);

  const scheduleUpdatePosition = useCallback(() => {
    let frameId = 0;

    return () => {
      if (frameId) return;

      frameId = window.requestAnimationFrame(() => {
        frameId = 0;
        updatePosition();
      });
    };
  }, [updatePosition]);

  useLayoutEffect(() => {
    if (!open) return;

    let raf1 = 0;
    let raf2 = 0;

    raf1 = requestAnimationFrame(() => {
      updatePosition();
      raf2 = requestAnimationFrame(() => updatePosition());
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

    const handleViewportChange = scheduleUpdatePosition();
    const resizeObserver = new ResizeObserver(() => {
      handleViewportChange();
    });

    resizeObserver.observe(anchor);
    resizeObserver.observe(panel);
    window.addEventListener("resize", handleViewportChange, { passive: true });
    window.addEventListener("scroll", handleViewportChange, {
      capture: true,
      passive: true,
    });
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [anchorRef, onClose, open, scheduleUpdatePosition]);

  useEffect(() => {
    if (!open) {
      setPosition({ top: 0, right: 0, ready: false });
    }
  }, [open]);

  function handleCategoryClick(categoryId: string) {
    if (activeCategoryId === categoryId) {
      resetDraftToPath({
        categoryId: null,
        modeId: null,
        groupId: null,
        optionIds: [],
        operator: "OR",
      });
      return;
    }

    selectCategory(categoryId);
  }

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
      categoryId: null,
      modeId: null,
      groupId: null,
      optionIds: [],
      operator: "OR",
    });
  }

  function handleApply() {
    onChange(draftFilters.filter((item) => item.optionIds.length > 0));
    onClose();
  }

  const panelContent = open ? (
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="false"
        className={cn(
          "fixed origin-top-right overflow-hidden rounded-2xl border border-border/70 bg-background text-foreground shadow-2xl transition-[opacity,transform] duration-150 ease-out",
          "flex max-h-[calc(100vh-1rem)] flex-col",
          isExpanded || draftFilters.length > 0 ? "min-h-[20rem]" : "min-h-[14rem]",
        )}
        style={{
          zIndex: UI_LAYERS.popover + 5,
          top: position.top,
          right: position.right,
          maxWidth: maxWidth
            ? `min(${maxWidth}px, calc(100vw - 1rem))`
            : "calc(100vw - 1rem)",
          minWidth: minWidth
            ? `min(${minWidth}px, calc(100vw - 1rem))`
            : undefined,
          visibility: position.ready ? "visible" : "hidden",
        }}
      >
        <div className="flex min-h-0 flex-1">
          <DataTableFilterColumn
            items={categoryItems}
            activeId={activeCategoryId}
            selectedIds={selectedCategoryIds}
            onItemClick={handleCategoryClick}
            emptyMessage={emptyMessage}
            showCheckOnSelected
            className={cn(
              "flex-none",
              isExpanded ? "border-r border-border/70" : "border-r-0",
            )}
          />

          {isExpanded ? (
            <section className="flex min-w-0 flex-1 flex-col bg-background">
              <div className="border-b border-border/70 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {activeCategory?.label ?? activeGroup?.label ?? "Opciones"}
                  </h3>

                  <div className="inline-flex items-center gap-2 rounded-md border border-border/70 bg-background px-2 py-1 text-xs">
                    <span className="text-muted-foreground">Filtro:</span>

                    <button
                      type="button"
                      onClick={() => setDraftOperator("OR")}
                      disabled={!activeGroupId}
                      className={cn(
                        "rounded px-2 py-1 font-medium transition",
                        !activeGroupId && "cursor-not-allowed opacity-50",
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
                      disabled={!activeGroupId}
                      className={cn(
                        "rounded px-2 py-1 font-medium transition",
                        !activeGroupId && "cursor-not-allowed opacity-50",
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
                    disabled={!activeGroupId}
                    placeholder="Buscar..."
                    className="h-9 w-full rounded-md border border-border/70 bg-background px-3 text-xs outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="scrollbar-panel min-h-0 flex-1 overflow-y-auto py-2">
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
                            "inline-flex h-5 min-w-5 items-center justify-center rounded border px-1.5",
                            isSelected
                              ? "border-primary/20 bg-primary/12 text-primary"
                              : "border-border/70 text-transparent",
                          )}
                        >
                          <Check className="h-3 w-3" />
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </section>
          ) : null}
        </div>

        {showFooter ? (
          <div className="flex items-center justify-between gap-3 border-t border-border/70 bg-muted/25 px-4 py-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleClearCurrent}
                disabled={!currentAppliedFilter}
                className="inline-flex h-9 items-center justify-center rounded-md border border-border/70 bg-background px-3 text-xs font-medium transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
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
        ) : null}
      </div>
  ) : null;

  if (typeof document === "undefined") return null;
  return createPortal(panelContent, document.body);
}
