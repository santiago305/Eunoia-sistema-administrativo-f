import {
  useState,
  cloneElement,
  isValidElement,
  ReactElement,
} from "react";
import { Link, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { IconChevronRight } from "./icons";
import { useSidebarContext } from "./SidebarContext";
import type { SidebarItem as SidebarItemType } from "./types";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface SidebarItemProps {
  item: SidebarItemType;
}

const SidebarItemComponent = ({ item }: SidebarItemProps) => {
  const { isCollapsed } = useSidebarContext();
  const location = useLocation();

  const hasChildren = !!item.children?.length;
  const isActive = item.href === location.pathname;
  const isChildActive = item.children?.some(
    (child) => child.href === location.pathname
  );

  // Solo abre inicialmente si algún hijo está activo.
  // Después de eso el usuario puede cerrarlo manualmente aunque siga en una ruta hija.
  const [isOpen, setIsOpen] = useState(Boolean(isChildActive));
  const [popoverOpen, setPopoverOpen] = useState(false);

  const isParentHighlighted = isActive || isChildActive;

  const renderIcon = () => {
    if (!item.icon || !isValidElement(item.icon)) return null;

    return cloneElement(item.icon as ReactElement<{ className?: string }>, {
      className: cn(
        "size-[18px] shrink-0 transition-colors duration-200",
        isParentHighlighted
          ? "text-primary"
          : "text-sidebar-foreground/90 group-hover:text-sidebar-foreground"
      ),
    });
  };

  const toggleChildren = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (hasChildren) setIsOpen((prev) => !prev);
  };

  const parentBaseClass = cn(
    "group flex w-full items-center rounded-xl transition-all duration-200",
    "min-h-10",
    isCollapsed ? "justify-center px-2 py-2" : "px-2.5 py-2",
    isParentHighlighted
      ? "bg-primary/10 text-primary shadow-sm"
      : "text-sidebar-foreground hover:bg-sidebar-accent/70"
  );

  const labelClass = cn(
    "truncate text-[14px] font-medium transition-all duration-200",
    isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100"
  );

  const childLinkClass = (active?: boolean) =>
    cn(
      "group/child flex min-h-8 items-center rounded-lg px-2.5 py-1.5 text-[13px] transition-all duration-200",
      active
        ? "bg-primary/8 text-primary font-medium"
        : "text-sidebar-muted hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
    );

  const caret = (
    <motion.span
      animate={{ rotate: isOpen ? 90 : 0 }}
      transition={{ duration: 0.18 }}
      className={cn(
        "flex items-center justify-center text-sidebar-muted",
        isParentHighlighted && "text-primary/80"
      )}
    >
      <IconChevronRight className="size-4" />
    </motion.span>
  );

  const ParentInnerContent = () => (
    <>
      {renderIcon()}
      {!isCollapsed && (
        <span className={cn("ml-3 flex-1 text-left", labelClass)}>
          {item.label}
        </span>
      )}
    </>
  );

  // ---------------------------------------------
  // COLLAPSED + CHILDREN => POPOVER
  // ---------------------------------------------
  if (isCollapsed && hasChildren) {
    return (
      <div className="mb-1">
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              title={item.label}
              className={parentBaseClass}
            >
              {renderIcon()}
            </button>
          </PopoverTrigger>

          <PopoverContent
            side="right"
            align="start"
            sideOffset={10}
            className="w-56 rounded-xl border border-border bg-popover p-2 shadow-xl"
          >
            <div className="mb-1 px-2 py-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {item.label}
              </p>
            </div>

            {item.href && (
              <Link
                to={item.href}
                onClick={() => setPopoverOpen(false)}
                className={cn(
                  "mb-1 flex min-h-9 items-center rounded-lg px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-foreground hover:bg-accent"
                )}
              >
                Resumen
              </Link>
            )}

            <div className="space-y-1">
              {item.children?.map((child, index) => {
                const childActive = child.href === location.pathname;

                return (
                  <Link
                    key={`${child.href ?? child.label}-${index}`}
                    to={child.href || "#"}
                    onClick={() => setPopoverOpen(false)}
                    className={cn(
                      "flex min-h-9 items-center rounded-lg px-3 py-2 text-sm transition-colors",
                      childActive
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    )}
                  >
                    {child.label}
                  </Link>
                );
              })}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    );
  }

  // ---------------------------------------------
  // COLLAPSED + SIN CHILDREN => TOOLTIP
  // ---------------------------------------------
  if (isCollapsed && !hasChildren) {
    const singleItem = item.href ? (
      <Link to={item.href} className={parentBaseClass}>
        {renderIcon()}
      </Link>
    ) : (
      <div className={parentBaseClass}>{renderIcon()}</div>
    );

    return (
      <div className="mb-1">
        <Tooltip delayDuration={100}>
          <TooltipTrigger asChild>{singleItem}</TooltipTrigger>
          <TooltipContent side="right" className="rounded-lg px-3 py-1.5">
            {item.label}
          </TooltipContent>
        </Tooltip>
      </div>
    );
  }

  // ---------------------------------------------
  // EXPANDED MODE
  // ---------------------------------------------
  return (
    <div className="mb-1">
      {hasChildren ? (
        <div
          className={cn(
            "flex items-center rounded-xl transition-all duration-200",
            isParentHighlighted
              ? "bg-primary/10 shadow-sm"
              : "hover:bg-sidebar-accent/70"
          )}
        >
          {item.href ? (
            <Link
              to={item.href}
              className="flex min-w-0 flex-1 items-center px-2.5 py-2"
            >
              <ParentInnerContent />
            </Link>
          ) : (
            <button
              title="button"
              type="button"
              onClick={toggleChildren}
              className="flex min-w-0 flex-1 items-center px-2.5 py-2 text-left"
            >
              <ParentInnerContent />
            </button>
          )}

          <button
            type="button"
            onClick={toggleChildren}
            title={isOpen ? `Ocultar submenu de ${item.label}` : `Mostrar submenu de ${item.label}`}
            className={cn(
              "mr-1 flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
              "hover:bg-black/5"
            )}
            aria-label={isOpen ? "Ocultar submenú" : "Mostrar submenú"}
          >
            {caret}
          </button>
        </div>
      ) : item.href ? (
        <Link to={item.href} className={parentBaseClass}>
          <ParentInnerContent />
        </Link>
      ) : (
        <div className={parentBaseClass}>
          <ParentInnerContent />
        </div>
      )}

      <AnimatePresence initial={false}>
        {hasChildren && isOpen && !isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <motion.div
              initial={{ y: -6 }}
              animate={{ y: 0 }}
              exit={{ y: -6 }}
              transition={{ duration: 0.18 }}
              className="relative ml-5 mt-1 pl-4"
            >
              {/* Línea lateral sutil */}
              <div className="absolute bottom-1 left-0 top-1 w-px rounded-full bg-border/80" />

              <div className="space-y-1">
                {item.children?.map((child, index) => {
                  const childActive = child.href === location.pathname;

                  return (
                    <Link
                      key={`${child.href ?? child.label}-${index}`}
                      to={child.href || "#"}
                      className={childLinkClass(childActive)}
                    >
                      <span
                        className={cn(
                          "truncate",
                          childActive ? "text-primary" : ""
                        )}
                      >
                        {child.label}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SidebarItemComponent;
