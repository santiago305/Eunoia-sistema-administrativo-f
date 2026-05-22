import { cn } from "@/shared/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import {
  type ReactNode,
  type RefObject,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { UI_LAYERS } from "../ui/layers";

type PopoverPlacement =
  | "bottom-start"
  | "bottom-end"
  | "top-start"
  | "top-end"
  | "right-start"
  | "left-start";

type PopoverAnimation = "scale" | "slide";

type PopoverProps = {
  open: boolean;
  onClose: () => void;
  anchorRef: RefObject<HTMLElement | null>;
  children: ReactNode;
  title?: string;
  description?: string;
  footer?: ReactNode;
  placement?: PopoverPlacement;
  offset?: number;
  closeOnOutsideClick?: boolean;
  closeOnEscape?: boolean;
  preventClose?: boolean;
  hideHeader?: boolean;
  showCloseButton?: boolean;
  initialFocusRef?: RefObject<HTMLElement | null>;
  animation?: PopoverAnimation;
  className?: string;
  headerClassName?: string;
  bodyClassName?: string;
  footerClassName?: string;
  titleClassName?: string;
  descriptionClassName?: string;
  closeButtonClassName?: string;
  zIndex?: number;
};

type PopoverSize = {
  width: number;
  height: number;
};

type PositionState = {
  top: number;
  left: number;
  ready: boolean;
  resolvedPlacement: PopoverPlacement;
  width: number;
  height: number;
};

const VIEWPORT_PADDING = 8;
const POSITION_EPSILON = 2;
const SIZE_EPSILON = 1;

function isCloseEnough(a: number, b: number, epsilon: number) {
  return Math.abs(a - b) <= epsilon;
}

function getCoords(
  selectedPlacement: PopoverPlacement,
  anchorRect: DOMRect,
  popoverSize: PopoverSize,
  offset: number,
) {
  switch (selectedPlacement) {
    case "bottom-start":
      return {
        top: anchorRect.bottom + offset,
        left: anchorRect.left,
      };

    case "bottom-end":
      return {
        top: anchorRect.bottom + offset,
        left: anchorRect.right - popoverSize.width,
      };

    case "top-start":
      return {
        top: anchorRect.top - popoverSize.height - offset,
        left: anchorRect.left,
      };

    case "top-end":
      return {
        top: anchorRect.top - popoverSize.height - offset,
        left: anchorRect.right - popoverSize.width,
      };

    case "right-start":
      return {
        top: anchorRect.top,
        left: anchorRect.right + offset,
      };

    case "left-start":
      return {
        top: anchorRect.top,
        left: anchorRect.left - popoverSize.width - offset,
      };

    default:
      return {
        top: anchorRect.bottom + offset,
        left: anchorRect.left,
      };
  }
}

function fitsInViewport(
  coords: { top: number; left: number },
  popoverSize: PopoverSize,
) {
  return {
    vertically:
      coords.top >= VIEWPORT_PADDING &&
      coords.top + popoverSize.height <= window.innerHeight - VIEWPORT_PADDING,

    horizontally:
      coords.left >= VIEWPORT_PADDING &&
      coords.left + popoverSize.width <= window.innerWidth - VIEWPORT_PADDING,
  };
}

function clampToViewport(
  coords: { top: number; left: number },
  popoverSize: PopoverSize,
) {
  const maxLeft = Math.max(
    VIEWPORT_PADDING,
    window.innerWidth - popoverSize.width - VIEWPORT_PADDING,
  );

  const maxTop = Math.max(
    VIEWPORT_PADDING,
    window.innerHeight - popoverSize.height - VIEWPORT_PADDING,
  );

  return {
    top: Math.max(VIEWPORT_PADDING, Math.min(coords.top, maxTop)),
    left: Math.max(VIEWPORT_PADDING, Math.min(coords.left, maxLeft)),
  };
}

function resolvePlacement(
  preferredPlacement: PopoverPlacement,
  anchorRect: DOMRect,
  popoverSize: PopoverSize,
  offset: number,
) {
  const candidates: PopoverPlacement[] = [preferredPlacement];

  switch (preferredPlacement) {
    case "bottom-start":
      candidates.push("top-start", "bottom-end", "top-end");
      break;

    case "bottom-end":
      candidates.push("top-end", "bottom-start", "top-start");
      break;

    case "top-start":
      candidates.push("bottom-start", "top-end", "bottom-end");
      break;

    case "top-end":
      candidates.push("bottom-end", "top-start", "bottom-start");
      break;

    case "right-start":
      candidates.push("left-start", "bottom-start", "top-start");
      break;

    case "left-start":
      candidates.push("right-start", "bottom-start", "top-start");
      break;
  }

  for (const candidate of candidates) {
    const coords = getCoords(candidate, anchorRect, popoverSize, offset);
    const fit = fitsInViewport(coords, popoverSize);

    const isVertical =
      candidate.startsWith("top") || candidate.startsWith("bottom");

    if ((isVertical && fit.vertically) || (!isVertical && fit.horizontally)) {
      return {
        placement: candidate,
        coords: clampToViewport(coords, popoverSize),
      };
    }
  }

  const fallbackCoords = getCoords(
    preferredPlacement,
    anchorRect,
    popoverSize,
    offset,
  );

  return {
    placement: preferredPlacement,
    coords: clampToViewport(fallbackCoords, popoverSize),
  };
}

export function Popover({
  open,
  onClose,
  anchorRef,
  children,
  title,
  description,
  footer,
  placement = "bottom-start",
  offset = 8,
  closeOnOutsideClick = true,
  closeOnEscape = true,
  preventClose = false,
  hideHeader = false,
  showCloseButton = false,
  initialFocusRef,
  animation = "scale",
  className,
  headerClassName,
  bodyClassName,
  footerClassName,
  titleClassName,
  descriptionClassName,
  closeButtonClassName,
  zIndex = UI_LAYERS.popover,
}: PopoverProps) {
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const lastAnchorRectRef = useRef<DOMRect | null>(null);
  const scheduledFrameRef = useRef<number | null>(null);
  const lastViewportSizeRef = useRef({
    width: 0,
    height: 0,
  });

  const canClose = !preventClose;

  const [position, setPosition] = useState<PositionState>({
    top: 0,
    left: 0,
    ready: false,
    resolvedPlacement: placement,
    width: 0,
    height: 0,
  });

  const updatePosition = useCallback(() => {
    const anchor = anchorRef.current;
    const popover = popoverRef.current;

    if (!anchor || !popover) return;

    const anchorRect = anchor.getBoundingClientRect();

    const popoverSize: PopoverSize = {
      width: popover.offsetWidth,
      height: popover.offsetHeight,
    };

    if (popoverSize.width === 0 || popoverSize.height === 0) return;

    lastAnchorRectRef.current = anchorRect;
    lastViewportSizeRef.current = {
      width: window.innerWidth,
      height: window.innerHeight,
    };

    const next = resolvePlacement(
      placement,
      anchorRect,
      popoverSize,
      offset,
    );

    const nextTop = Math.round(next.coords.top);
    const nextLeft = Math.round(next.coords.left);

    setPosition((previous) => {
      const sameTop = isCloseEnough(
        previous.top,
        nextTop,
        POSITION_EPSILON,
      );

      const sameLeft = isCloseEnough(
        previous.left,
        nextLeft,
        POSITION_EPSILON,
      );

      const sameWidth = isCloseEnough(
        previous.width,
        popoverSize.width,
        SIZE_EPSILON,
      );

      const sameHeight = isCloseEnough(
        previous.height,
        popoverSize.height,
        SIZE_EPSILON,
      );

      const samePlacement = previous.resolvedPlacement === next.placement;

      if (
        previous.ready &&
        sameTop &&
        sameLeft &&
        sameWidth &&
        sameHeight &&
        samePlacement
      ) {
        return previous;
      }

      return {
        top: nextTop,
        left: nextLeft,
        ready: true,
        resolvedPlacement: next.placement,
        width: popoverSize.width,
        height: popoverSize.height,
      };
    });
  }, [anchorRef, offset, placement]);

  const scheduleUpdatePosition = useCallback(() => {
    if (scheduledFrameRef.current !== null) return;

    scheduledFrameRef.current = window.requestAnimationFrame(() => {
      scheduledFrameRef.current = null;
      updatePosition();
    });
  }, [updatePosition]);

  const hasAnchorOrViewportChanged = useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor) return false;

    const rect = anchor.getBoundingClientRect();
    const lastRect = lastAnchorRectRef.current;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const lastViewport = lastViewportSizeRef.current;

    const viewportChanged =
      viewportWidth !== lastViewport.width ||
      viewportHeight !== lastViewport.height;

    const anchorChanged =
      !lastRect ||
      Math.abs(rect.top - lastRect.top) > 1 ||
      Math.abs(rect.left - lastRect.left) > 1 ||
      Math.abs(rect.right - lastRect.right) > 1 ||
      Math.abs(rect.bottom - lastRect.bottom) > 1 ||
      Math.abs(rect.width - lastRect.width) > 1 ||
      Math.abs(rect.height - lastRect.height) > 1;

    if (anchorChanged || viewportChanged) {
      lastAnchorRectRef.current = rect;
      lastViewportSizeRef.current = {
        width: viewportWidth,
        height: viewportHeight,
      };

      return true;
    }

    return false;
  }, [anchorRef]);

  useLayoutEffect(() => {
    if (!open) return;

    let raf1 = 0;
    let raf2 = 0;

    updatePosition();

    raf1 = window.requestAnimationFrame(() => {
      updatePosition();

      raf2 = window.requestAnimationFrame(() => {
        updatePosition();
      });
    });

    return () => {
      window.cancelAnimationFrame(raf1);
      window.cancelAnimationFrame(raf2);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;

    let frameId = 0;

    const trackPosition = () => {
      if (hasAnchorOrViewportChanged()) {
        updatePosition();
      }

      frameId = window.requestAnimationFrame(trackPosition);
    };

    frameId = window.requestAnimationFrame(trackPosition);

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [open, hasAnchorOrViewportChanged, updatePosition]);

  useEffect(() => {
    if (!open) return;

    const anchor = anchorRef.current;
    const popover = popoverRef.current;

    if (!anchor || !popover) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && closeOnEscape && canClose) {
        onClose();
      }
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (!closeOnOutsideClick || !canClose) return;

      const target = event.target as Node;
      const currentPopover = popoverRef.current;
      const currentAnchor = anchorRef.current;
      const targetElement = target instanceof Element ? target : null;

      const clickedInsidePopover = currentPopover?.contains(target);
      const clickedAnchor = currentAnchor?.contains(target);
      const clickedFloatingOverlay = Boolean(
        targetElement?.closest('[data-floating-overlay-root="true"]'),
      );

      if (!clickedInsidePopover && !clickedAnchor && !clickedFloatingOverlay) {
        onClose();
      }
    };

    const handleViewportChange = () => {
      scheduleUpdatePosition();
    };

    const handleScroll = (event: Event) => {
      const target = event.target as Node | null;
      const currentPopover = popoverRef.current;

      if (target && currentPopover?.contains(target)) {
        return;
      }

      scheduleUpdatePosition();
    };

    const resizeObserver = new ResizeObserver(() => {
      scheduleUpdatePosition();
    });

    resizeObserver.observe(anchor);
    resizeObserver.observe(popover);

    window.addEventListener("resize", handleViewportChange, {
      passive: true,
    });

    window.addEventListener("scroll", handleScroll, {
      capture: true,
      passive: true,
    });

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);

    if (initialFocusRef?.current) {
      window.requestAnimationFrame(() => {
        initialFocusRef.current?.focus();
      });
    }

    return () => {
      resizeObserver.disconnect();

      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleScroll, true);

      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);

      if (scheduledFrameRef.current !== null) {
        window.cancelAnimationFrame(scheduledFrameRef.current);
        scheduledFrameRef.current = null;
      }
    };
  }, [
    anchorRef,
    canClose,
    closeOnEscape,
    closeOnOutsideClick,
    initialFocusRef,
    onClose,
    open,
    scheduleUpdatePosition,
  ]);

  useEffect(() => {
    if (!open) {
      lastAnchorRectRef.current = null;
      lastViewportSizeRef.current = {
        width: 0,
        height: 0,
      };

      if (scheduledFrameRef.current !== null) {
        window.cancelAnimationFrame(scheduledFrameRef.current);
        scheduledFrameRef.current = null;
      }

      setPosition({
        top: 0,
        left: 0,
        ready: false,
        resolvedPlacement: placement,
        width: 0,
        height: 0,
      });
    }
  }, [open, placement]);

  const contentAnimationProps =
    animation === "slide"
      ? {
          initial: { y: 10 },
          animate: { y: 0 },
          exit: { y: 8 },
        }
      : {
          initial: { scale: 0.98 },
          animate: { scale: 1 },
          exit: { scale: 0.98 },
        };

  const transformOriginClass =
    position.resolvedPlacement === "bottom-start"
      ? "origin-top-left"
      : position.resolvedPlacement === "bottom-end"
        ? "origin-top-right"
        : position.resolvedPlacement === "top-start"
          ? "origin-bottom-left"
          : position.resolvedPlacement === "top-end"
            ? "origin-bottom-right"
            : position.resolvedPlacement === "right-start"
              ? "origin-left-top"
              : "origin-right-top";

  const popoverContent = (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="popover-wrapper"
          ref={popoverRef}
          role="dialog"
          aria-modal="false"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
          style={{
            position: "fixed",
            top: position.top,
            left: position.left,
            zIndex,
            visibility: position.ready ? "visible" : "hidden",
          }}
        >
          <motion.div
            className={cn(
              "flex max-h-[calc(100vh-1rem)] min-w-44 max-w-[calc(100vw-1rem)] flex-col overflow-hidden rounded-2xl border border-border bg-popover text-popover-foreground shadow-floating-panel",
              transformOriginClass,
              className,
            )}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            {...contentAnimationProps}
          >
            {!hideHeader && (title || description || showCloseButton) ? (
              <div
                className={cn(
                  "flex items-start justify-between gap-4 border-b border-border/70 bg-muted/35 px-4 py-3",
                  headerClassName,
                )}
              >
                <div className="min-w-0">
                  {title ? (
                    <h3
                      className={cn(
                        "text-sm font-semibold tracking-tight text-foreground",
                        titleClassName,
                      )}
                    >
                      {title}
                    </h3>
                  ) : null}

                  {description ? (
                    <p
                      className={cn(
                        "mt-1 text-xs leading-5 text-muted-foreground",
                        descriptionClassName,
                      )}
                    >
                      {description}
                    </p>
                  ) : null}
                </div>

                {showCloseButton && canClose ? (
                  <button
                    type="button"
                    onClick={onClose}
                    className={cn(
                      "inline-flex h-7 w-7 items-center justify-center rounded-xl text-muted-foreground transition hover:bg-muted hover:text-foreground",
                      closeButtonClassName,
                    )}
                    aria-label="Cerrar"
                  >
                    <span className="text-base leading-none">x</span>
                  </button>
                ) : null}
              </div>
            ) : null}

            <div
              className={cn(
                "scrollbar-panel min-h-0 overflow-y-auto py-2",
                bodyClassName,
              )}
            >
              {children}
            </div>

            {footer ? (
              <div
                className={cn(
                  "border-t border-border/70 bg-muted/35 px-4 py-3",
                  footerClassName,
                )}
              >
                {footer}
              </div>
            ) : null}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(popoverContent, document.body);
}
