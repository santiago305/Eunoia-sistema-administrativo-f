import {
  type ReactNode,
  type RefObject,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

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
  popRect: DOMRect,
  offset: number
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
        left: anchorRect.right - popRect.width,
      };

    case "top-start":
      return {
        top: anchorRect.top - popRect.height - offset,
        left: anchorRect.left,
      };

    case "top-end":
      return {
        top: anchorRect.top - popRect.height - offset,
        left: anchorRect.right - popRect.width,
      };

    case "right-start":
      return {
        top: anchorRect.top,
        left: anchorRect.right + offset,
      };

    case "left-start":
      return {
        top: anchorRect.top,
        left: anchorRect.left - popRect.width - offset,
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
  popRect: DOMRect
) {
  return {
    vertically:
      coords.top >= VIEWPORT_PADDING &&
      coords.top + popRect.height <= window.innerHeight - VIEWPORT_PADDING,
    horizontally:
      coords.left >= VIEWPORT_PADDING &&
      coords.left + popRect.width <= window.innerWidth - VIEWPORT_PADDING,
  };
}

function clampToViewport(
  coords: { top: number; left: number },
  popRect: DOMRect
) {
  const maxLeft = Math.max(
    VIEWPORT_PADDING,
    window.innerWidth - popRect.width - VIEWPORT_PADDING
  );
  const maxTop = Math.max(
    VIEWPORT_PADDING,
    window.innerHeight - popRect.height - VIEWPORT_PADDING
  );

  return {
    top: Math.max(VIEWPORT_PADDING, Math.min(coords.top, maxTop)),
    left: Math.max(VIEWPORT_PADDING, Math.min(coords.left, maxLeft)),
  };
}

function resolvePlacement(
  preferredPlacement: PopoverPlacement,
  anchorRect: DOMRect,
  popRect: DOMRect,
  offset: number
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
    const coords = getCoords(candidate, anchorRect, popRect, offset);
    const fit = fitsInViewport(coords, popRect);
    const isVertical =
      candidate.startsWith("top") || candidate.startsWith("bottom");

    if ((isVertical && fit.vertically) || (!isVertical && fit.horizontally)) {
      return {
        placement: candidate,
        coords: clampToViewport(coords, popRect),
      };
    }
  }

  const fallbackCoords = getCoords(
    preferredPlacement,
    anchorRect,
    popRect,
    offset
  );

  return {
    placement: preferredPlacement,
    coords: clampToViewport(fallbackCoords, popRect),
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
}: PopoverProps) {
  const popoverRef = useRef<HTMLDivElement | null>(null);
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
    const popRect = popover.getBoundingClientRect();

    if (popRect.width === 0 || popRect.height === 0) return;

    const next = resolvePlacement(placement, anchorRect, popRect, offset);

    setPosition((prev) => {
      const sameTop = isCloseEnough(prev.top, next.coords.top, POSITION_EPSILON);
      const sameLeft = isCloseEnough(
        prev.left,
        next.coords.left,
        POSITION_EPSILON
      );
      const sameWidth = isCloseEnough(prev.width, popRect.width, SIZE_EPSILON);
      const sameHeight = isCloseEnough(
        prev.height,
        popRect.height,
        SIZE_EPSILON
      );
      const samePlacement = prev.resolvedPlacement === next.placement;

      if (
        prev.ready &&
        sameTop &&
        sameLeft &&
        sameWidth &&
        sameHeight &&
        samePlacement
      ) {
        return prev;
      }

      return {
        top: next.coords.top,
        left: next.coords.left,
        ready: true,
        resolvedPlacement: next.placement,
        width: popRect.width,
        height: popRect.height,
      };
    });
  }, [anchorRef, placement, offset]);

  useLayoutEffect(() => {
    if (!open) return;

    let raf1 = 0;
    let raf2 = 0;

    updatePosition();

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
    const popover = popoverRef.current;

    if (!anchor || !popover) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && closeOnEscape && canClose) {
        onClose();
      }
    };

    const handlePointerDown = (event: MouseEvent) => {
      if (!closeOnOutsideClick || !canClose) return;

      const target = event.target as Node;
      const currentPopover = popoverRef.current;
      const currentAnchor = anchorRef.current;

      const clickedInsidePopover = currentPopover?.contains(target);
      const clickedAnchor = currentAnchor?.contains(target);

      if (!clickedInsidePopover && !clickedAnchor) {
        onClose();
      }
    };

    const handleResize = () => {
      updatePosition();
    };

    const resizeObserver = new ResizeObserver(() => {
      updatePosition();
    });

    resizeObserver.observe(anchor);
    resizeObserver.observe(popover);

    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", updatePosition);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handlePointerDown);

    if (initialFocusRef?.current) {
      requestAnimationFrame(() => {
        initialFocusRef.current?.focus();
      });
    }

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", updatePosition);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [
    open,
    anchorRef,
    closeOnEscape,
    closeOnOutsideClick,
    canClose,
    onClose,
    initialFocusRef,
    updatePosition,
  ]);

  useEffect(() => {
    if (!open) {
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

  const animationProps =
    animation === "slide"
      ? {
          initial: { opacity: 0, y: 10 },
          animate: { opacity: 1, y: 0 },
          exit: { opacity: 0, y: 8 },
        }
      : {
          initial: { opacity: 0, scale: 0.98 },
          animate: { opacity: 1, scale: 1 },
          exit: { opacity: 0, scale: 0.98 },
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

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={popoverRef}
          role="dialog"
          aria-modal="false"
          className={cn(
            "fixed z-50 flex max-h-[calc(100vh-1rem)] min-w-88 max-w-[calc(100vw-1rem)] flex-col overflow-hidden",
            "rounded-2xl border border-border bg-popover text-popover-foreground",
            "shadow-[0_16px_40px_-16px_rgba(0,0,0,0.22)] dark:shadow-[0_20px_50px_-20px_rgba(0,0,0,0.65)]",
            transformOriginClass,
            className
          )}
          style={{
            top: position.top,
            left: position.left,
            visibility: position.ready ? "visible" : "hidden",
          }}
          transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
          {...animationProps}
        >
          {!hideHeader && (title || description || showCloseButton) && (
            <div
              className={cn(
                "flex items-start justify-between gap-3 px-3 py-2",
                headerClassName
              )}
            >
              <div className="min-w-0">
                {title && (
                  <h3
                    className={cn(
                      "text-[10px] tracking-tight text-popover-foreground",
                      titleClassName
                    )}
                  >
                    {title}
                  </h3>
                )}

                {description && (
                  <p
                    className={cn(
                      "mt-1 text-xs leading-5 text-muted-foreground",
                      descriptionClassName
                    )}
                  >
                    {description}
                  </p>
                )}
              </div>

              {showCloseButton && canClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className={cn(
                    "inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition hover:bg-muted hover:text-foreground",
                    closeButtonClassName
                  )}
                  aria-label="Cerrar popover"
                >
                  x
                </button>
              )}
            </div>
          )}

          <div
            className={cn(
              "scrollbar-panel overflow-y-auto px-2 pb-2",
              bodyClassName
            )}
          >
            {children}
          </div>

          {footer && (
            <div
              className={cn(
                "border-t border-border bg-muted/40 px-4 py-3",
                footerClassName
              )}
            >
              {footer}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
