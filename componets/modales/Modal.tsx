import {
  type ReactNode,
  type RefObject,
  useEffect,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
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

export function Modal({
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

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && closeOnEscape && canClose) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;

    if (lockScroll) {
      const scrollbarWidth =
        window.innerWidth - document.documentElement.clientWidth;
      const computedPaddingRight = Number.parseFloat(
        window.getComputedStyle(document.body).paddingRight
      );

      document.body.style.overflow = "hidden";

      if (scrollbarWidth > 0) {
        document.body.style.paddingRight = `${
          computedPaddingRight + scrollbarWidth
        }px`;
      }
    }

    if (initialFocusRef?.current) {
      requestAnimationFrame(() => {
        initialFocusRef.current?.focus();
      });
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
    };
  }, [open, closeOnEscape, canClose, onClose, lockScroll, initialFocusRef]);

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
    if (closeOnOverlayClick && canClose) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50">
          {showOverlay && (
            <motion.div
              className={cn(
                "absolute inset-0 bg-black/40 dark:bg-black/60",
                overlayBlur && "backdrop-blur-[2px]",
                overlayClassName
              )}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
          )}

          <div
            className={cn(
              "relative flex min-h-full w-full items-center justify-center p-4 sm:p-6",
              containerClassName
            )}
            onClick={handleBackdropClick}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label={title || "Modal"}
              onClick={(e) => e.stopPropagation()}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className={cn(
                "relative flex h-auto max-h-[calc(100vh-2rem)] w-auto max-w-[calc(100vw-2rem)] flex-col overflow-hidden",
                "rounded-xl border border-border bg-background",
                "shadow-[0_20px_50px_-18px_rgba(0,0,0,0.22)] dark:shadow-[0_24px_60px_-24px_rgba(0,0,0,0.7)]",
                className
              )}
              {...animationProps}
            >
              {!hideHeader && (title || description || showCloseButton) && (
                <div
                  className={cn(
                    "flex items-start justify-between gap-4 border-b border-border bg-muted/40 px-3 py-3",
                    headerClassName
                  )}
                >
                  <div className="min-w-0">
                    {title && (
                      <h2
                        className={cn(
                          "text-sm font-semibold tracking-tight text-foreground",
                          titleClassName
                        )}
                      >
                        {title}
                      </h2>
                    )}

                    {description && (
                      <p
                        className={cn(
                          "mt-1 text-sm leading-5 text-muted-foreground",
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
                        "inline-flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-background text-muted-foreground transition-colors",
                        "hover:bg-muted hover:text-foreground",
                        closeButtonClassName
                      )}
                      aria-label="Cerrar modal"
                    >
                      <span className="text-base leading-none">x</span>
                    </button>
                  )}
                </div>
              )}

              <div className="scrollbar-panel min-h-0 flex-1 overflow-y-auto">
                <div className={cn("px-4 py-4", bodyClassName)}>{children}</div>
              </div>

              {footer && (
                <div
                  className={cn(
                    "border-t border-border bg-muted/40 px-5 py-4",
                    footerClassName
                  )}
                >
                  {footer}
                </div>
              )}
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
