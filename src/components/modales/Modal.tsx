import { AnimatePresence, motion } from "framer-motion";
import { type ReactNode, type RefObject, useCallback, useEffect, useId, useRef } from "react";
import { dispatchCloseAllFloatingSelects } from "@/components/floatingSelectEvents";
import { UI_LAYERS } from "@/components/ui/layers";
import { cn } from "@/lib/utils";

type ModalAnimation = "scale" | "slide";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  description?: string;
  footer?: ReactNode;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  lockScroll?: boolean;
  preventClose?: boolean;
  showOverlay?: boolean;
  overlayBlur?: boolean;
  showCloseButton?: boolean;
  hideHeader?: boolean;
  initialFocusRef?: RefObject<HTMLElement | null>;
  animation?: ModalAnimation;
  className?: string;
  overlayClassName?: string;
  containerClassName?: string;
  headerClassName?: string;
  bodyClassName?: string;
  footerClassName?: string;
  titleClassName?: string;
  descriptionClassName?: string;
  closeButtonClassName?: string;
};

const FOCUSABLE_SELECTOR = [
  "button:not([disabled])",
  "[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(", ");

export function  Modal({
  open,
  onClose,
  children,
  title,
  description,
  footer,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  lockScroll = true,
  preventClose = false,
  showOverlay = true,
  overlayBlur = false,
  showCloseButton = true,
  hideHeader = false,
  initialFocusRef,
  animation = "scale",
  className,
  overlayClassName,
  containerClassName,
  headerClassName,
  bodyClassName,
  footerClassName,
  titleClassName,
  descriptionClassName,
  closeButtonClassName,
}: ModalProps) {
  const canClose = !preventClose;
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const previousFocusedElementRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();
  const overlayTransition = { duration: 0.2, ease: [0.22, 1, 0.36, 1] as const };

  const handleRequestClose = useCallback(() => {
    if (!canClose) return;
    dispatchCloseAllFloatingSelects();
    onClose();
  }, [canClose, onClose]);

  useEffect(() => {
    if (!open) return;

    // Product decision: any modal transition should clear floating selects
    // so no detached panel can remain above or behind the dialog.
    dispatchCloseAllFloatingSelects();
    previousFocusedElementRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && closeOnEscape) {
        handleRequestClose();
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) return;

      const focusableElements = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((element) => !element.hasAttribute("disabled"));

      if (focusableElements.length === 0) {
        event.preventDefault();
        dialogRef.current.focus();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;

      if (event.shiftKey) {
        if (!activeElement || activeElement === firstElement || !dialogRef.current.contains(activeElement)) {
          event.preventDefault();
          lastElement.focus();
        }
        return;
      }

      if (!activeElement || activeElement === lastElement || !dialogRef.current.contains(activeElement)) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;

    if (lockScroll) {
      const scrollbarWidth =
        window.innerWidth - document.documentElement.clientWidth;
      const computedPaddingRight = Number.parseFloat(
        window.getComputedStyle(document.body).paddingRight,
      );

      document.body.style.overflow = "hidden";

      if (scrollbarWidth > 0) {
        document.body.style.paddingRight = `${computedPaddingRight + scrollbarWidth}px`;
      }
    }

    if (initialFocusRef?.current) {
      requestAnimationFrame(() => {
        initialFocusRef.current?.focus();
      });
    } else {
      requestAnimationFrame(() => {
        const dialogElement = dialogRef.current;
        if (!dialogElement) return;

        const focusableElements = Array.from(
          dialogElement.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
        ).filter((element) => !element.hasAttribute("disabled"));

        if (focusableElements.length > 0) {
          focusableElements[0].focus();
          return;
        }

        dialogElement.focus();
      });
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
      const previousFocusedElement = previousFocusedElementRef.current;
      if (previousFocusedElement?.isConnected) {
        requestAnimationFrame(() => {
          previousFocusedElement.focus();
        });
      }
    };
  }, [closeOnEscape, handleRequestClose, initialFocusRef, lockScroll, open]);

  const animationProps =
    animation === "slide"
      ? {
          initial: { opacity: 0, y: 24 },
          animate: { opacity: 1, y: 0 },
          exit: { opacity: 0, y: 18 },
        }
      : {
          initial: { opacity: 0, scale: 0.985, y: 10 },
          animate: { opacity: 1, scale: 1, y: 0 },
          exit: { opacity: 0, scale: 0.985, y: 8 },
        };

  const handleBackdropClick = () => {
    if (closeOnOverlayClick) {
      handleRequestClose();
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0" style={{ zIndex: UI_LAYERS.modalOverlay }}>
          {showOverlay ? (
            <motion.div
              className={cn(
                "absolute inset-0 bg-black/40",
                overlayBlur && "backdrop-blur-[2px]",
                overlayClassName,
              )}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={overlayTransition}
            />
          ) : null}

          <div
            className={cn(
              "relative flex min-h-full w-full items-center justify-center p-4 sm:p-6",
              containerClassName,
            )}
            style={{ zIndex: UI_LAYERS.modalContent }}
            onClick={handleBackdropClick}
          >
            <motion.div
              ref={dialogRef}
              role="dialog"
              aria-modal="true"
              aria-label={!title ? "Modal" : undefined}
              aria-labelledby={title ? titleId : undefined}
              aria-describedby={description ? descriptionId : undefined}
              tabIndex={-1}
              onClick={(event) => event.stopPropagation()}
              transition={overlayTransition}
              className={cn(
                "relative flex h-auto max-h-[calc(100vh-2rem)] w-auto max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-xl border border-border bg-background shadow-modal-panel",
                className,
              )}
              {...animationProps}
            >
              {!hideHeader && (title || description || showCloseButton) ? (
                <div
                  className={cn(
                    "shrink-0 flex items-start justify-between gap-4 border-b border-border bg-muted/40 px-3 py-3",
                    headerClassName,
                  )}
                >
                  <div className="min-w-0">
                    {title ? (
                      <h2
                        id={titleId}
                        className={cn(
                          "text-sm font-semibold tracking-tight text-foreground",
                          titleClassName,
                        )}
                      >
                        {title}
                      </h2>
                    ) : null}

                    {description ? (
                      <p
                        id={descriptionId}
                        className={cn(
                          "mt-1 text-sm leading-5 text-muted-foreground",
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
                      onClick={handleRequestClose}
                      className={cn(
                        "inline-flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                        closeButtonClassName,
                      )}
                      aria-label="Cerrar modal"
                    >
                      <span className="text-base leading-none">x</span>
                    </button>
                  ) : null}
                </div>
              ) : null}

              <div className="scroll-area scrollbar-panel min-h-0 flex-1 overflow-y-auto">
                <div className={cn("px-4 py-4", bodyClassName)}>{children}</div>
              </div>

              {footer ? (
                <div
                  className={cn(
                    "shrink-0 border-t border-border bg-muted/40 px-5 py-4",
                    footerClassName,
                  )}
                >
                  {footer}
                </div>
              ) : null}
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
