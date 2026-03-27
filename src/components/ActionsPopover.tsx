import { useMemo, useRef, useState, type ReactNode } from "react";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover } from "./modales/Popover";

export type ActionsPopoverPlacement =
  | "bottom-start"
  | "bottom-end"
  | "top-start"
  | "top-end"
  | "right-start"
  | "left-start";

export type ActionsPopoverAnimation = "scale" | "slide";
export type ActionsTriggerVariant = "ghost" | "subtle" | "outline" | "solid";

export type ActionItem = {
  id: string;
  label: string;
  icon?: ReactNode;
  description?: string;
  badge?: ReactNode;

  onClick?: () => void;
  href?: string;
  target?: "_self" | "_blank" | "_parent" | "_top";

  disabled?: boolean;
  danger?: boolean;
  hidden?: boolean;

  className?: string;
};

type RenderActionHelpers = {
  close: () => void;
  onAction: (action: ActionItem) => void;
  compact: boolean;
  showLabels: boolean;
};

export type RenderAction = (
  action: ActionItem,
  helpers: RenderActionHelpers
) => ReactNode;

type ActionsPopoverProps = {
  actions: ActionItem[];

  open?: boolean;
  onOpenChange?: (open: boolean) => void;

  title?: string;
  description?: string;
  footer?: ReactNode;

  placement?: ActionsPopoverPlacement;
  animation?: ActionsPopoverAnimation;
  offset?: number;

  closeOnAction?: boolean;
  closeOnHref?: boolean;

  columns?: 1 | 2 | 3 | 4;
  compact?: boolean;
  showLabels?: boolean;

  triggerLabel?: string;
  triggerIcon?: ReactNode;
  triggerVariant?: ActionsTriggerVariant;
  triggerClassName?: string;
  triggerIconClassName?: string;
  disabled?: boolean;

  popoverClassName?: string;
  popoverBodyClassName?: string;
  gridClassName?: string;
  itemClassName?: string;

  renderAction?: RenderAction;
};

function getTriggerVariantClasses(variant: ActionsTriggerVariant) {
  switch (variant) {
    case "subtle":
      return "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground";
    case "outline":
      return "border border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground";
    case "solid":
      return "bg-foreground text-background hover:opacity-90";
    case "ghost":
    default:
      return "text-muted-foreground hover:bg-muted hover:text-foreground";
  }
}

function getColumnsClass(columns: 1 | 2 | 3 | 4) {
  switch (columns) {
    case 1:
      return "grid-cols-1";
    case 2:
      return "grid-cols-2";
    case 3:
      return "grid-cols-3";
    case 4:
      return "grid-cols-4";
    default:
      return "grid-cols-2";
  }
}

export function ActionsPopover({
  actions,
  open,
  onOpenChange,
  title = "Acciones",
  description,
  footer,
  placement = "bottom-end",
  animation = "scale",
  offset = 8,
  closeOnAction = true,
  closeOnHref = true,
  columns = 2,
  compact = false,
  showLabels = true,
  triggerLabel = "Abrir acciones",
  triggerIcon,
  triggerVariant = "ghost",
  triggerClassName,
  triggerIconClassName,
  disabled = false,
  popoverClassName,
  popoverBodyClassName,
  gridClassName,
  itemClassName,
  renderAction,
}: ActionsPopoverProps) {
  const anchorRef = useRef<HTMLButtonElement | null>(null);
  const [internalOpen, setInternalOpen] = useState(false);

  const isControlled = typeof open === "boolean";
  const isOpen = isControlled ? open : internalOpen;

  const setOpen = (next: boolean) => {
    if (!isControlled) {
      setInternalOpen(next);
    }
    onOpenChange?.(next);
  };

  const close = () => setOpen(false);
  const toggle = () => setOpen(!isOpen);

  const visibleActions = useMemo(
    () => actions.filter((action) => !action.hidden),
    [actions]
  );

  const handleAction = (action: ActionItem) => {
    if (action.disabled) return;

    action.onClick?.();

    if (closeOnAction) {
      close();
    }
  };

  const helpers: RenderActionHelpers = {
    close,
    onAction: handleAction,
    compact,
    showLabels,
  };

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        onClick={toggle}
        disabled={disabled}
        aria-label={triggerLabel}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className={cn(
          "inline-flex cursor-pointer items-center justify-center rounded-md transition-all duration-200",
          "disabled:pointer-events-none disabled:opacity-50",
          compact ? "h-8 w-8" : "h-9 w-9",
          getTriggerVariantClasses(triggerVariant),
          triggerClassName
        )}
      >
        <span
          className={cn(
            "flex items-center justify-center",
            compact ? "h-4 w-4" : "h-4.5 w-4.5",
            triggerIconClassName
          )}
        >
          {triggerIcon ?? <Menu className="h-full w-full" />}
        </span>
      </button>

      <Popover
        open={isOpen}
        onClose={close}
        anchorRef={anchorRef}
        title={title}
        description={description}
        footer={footer}
        placement={placement}
        offset={offset}
        animation={animation}
        className={cn(
          "max-w-[calc(100vw-1rem)] rounded-xl border-border bg-popover text-popover-foreground",
          compact ? "min-w-40" : "min-w-48",
          popoverClassName
        )}
        bodyClassName={cn(popoverBodyClassName)}
      >
        <div
          className={cn(
            "grid gap-2",
            getColumnsClass(columns),
            gridClassName
          )}
        >
          {visibleActions.map((action) => {
            if (renderAction) {
              return (
                <div key={action.id}>
                  {renderAction(action, helpers)}
                </div>
              );
            }

            const isLink = !!action.href && !action.disabled;
            const sizeClasses = compact ? "h-auto" : "h-auto";
            const iconBoxClasses = compact ? "h-6 w-6" : "h-8 w-8";

            const sharedClassName = cn(
              "group flex w-full items-center justify-center gap-2 rounded-md text-center transition-all cursor-pointer",
              "text-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring/40",
              "disabled:pointer-events-none disabled:opacity-45",
              sizeClasses,
              action.danger && "text-red-600 hover:bg-red-500/10 hover:text-red-600 dark:text-red-400 dark:hover:text-red-400",
              itemClassName,
              action.className
            );

            const content = (
              <>
                <div className="flex items-center justify-center">
                  <div
                    className={cn(
                      "flex items-center justify-center transition-colors text-muted-foreground",
                      iconBoxClasses,
                      action.danger && "text-red-600 dark:text-red-400"
                    )}
                  >
                    {action.icon}
                  </div>
                </div>

                {showLabels && (
                  <div className="min-w-0">
                    <div
                      className={cn(
                        "truncate font-medium",
                        compact ? "text-[11px] leading-4" : "text-xs leading-4"
                      )}
                    >
                      {action.label}
                    </div>

                    {action.description && !compact && (
                      <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-muted-foreground">
                        {action.description}
                      </p>
                    )}
                  </div>
                )}

                {action.badge && <div className="mt-0.5">{action.badge}</div>}
              </>
            );

            if (isLink) {
              return (
                <a
                  key={action.id}
                  href={action.href}
                  target={action.target}
                  rel={action.target === "_blank" ? "noreferrer" : undefined}
                  onClick={() => {
                    if (closeOnHref) close();
                  }}
                  className={sharedClassName}
                >
                  {content}
                </a>
              );
            }

            return (
              <button
                key={action.id}
                type="button"
                disabled={action.disabled}
                onClick={() => handleAction(action)}
                className={sharedClassName}
              >
                {content}
              </button>
            );
          })}
        </div>
      </Popover>
    </>
  );
}
